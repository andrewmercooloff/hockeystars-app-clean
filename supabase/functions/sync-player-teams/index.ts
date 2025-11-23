// Edge Function для синхронизации команд игрока
// Использует SERVICE_ROLE_KEY для обхода RLS политик
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_KEY = Deno.env.get('SERVICE_ROLE_KEY')!

interface PastTeam {
  id: string
  teamName: string
  startYear?: number
  endYear?: number
  isCurrent: boolean
}

interface SyncTeamsRequest {
  playerId: string
  currentTeams: PastTeam[]
  pastTeams: PastTeam[]
}

serve(async (req) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  }

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  // Используем SERVICE_ROLE_KEY для обхода RLS
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  })

  try {
    const { playerId, currentTeams, pastTeams }: SyncTeamsRequest = await req.json()

    if (!playerId) {
      return new Response(
        JSON.stringify({ success: false, error: 'playerId не указан' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 1. Создаем бэкап существующих команд
    const { data: oldTeamsData, error: backupError } = await supabase
      .from('player_teams')
      .select('*')
      .eq('player_id', playerId)

    if (backupError) {
      console.error('❌ Ошибка создания бэкапа команд:', backupError)
      return new Response(
        JSON.stringify({ success: false, error: 'Ошибка создания бэкапа команд' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 2. Подготавливаем все команды для добавления
    const allTeams = [
      ...currentTeams.map(team => ({ ...team, isCurrent: true })),
      ...pastTeams.filter(team => !team.isCurrent).map(team => ({ ...team, isCurrent: false }))
    ]

    // 3. Проверяем валидность всех ID команд
    const invalidTeams = allTeams.filter(team => !team.id || team.id === 'undefined' || team.id === 'null')
    if (invalidTeams.length > 0) {
      console.error('❌ Найдены невалидные ID команд:', invalidTeams)
      return new Response(
        JSON.stringify({ success: false, error: 'Найдены невалидные ID команд' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 4. Очищаем поле pastTeams в таблице players
    const { error: clearPastTeamsError } = await supabase
      .from('players')
      .update({ past_teams: '[]' })
      .eq('id', playerId)

    if (clearPastTeamsError) {
      console.error('❌ Ошибка очистки поля pastTeams:', clearPastTeamsError)
      return new Response(
        JSON.stringify({ success: false, error: 'Ошибка очистки поля pastTeams' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 5. Удаляем все существующие команды игрока
    const { error: deleteTeamsError } = await supabase
      .from('player_teams')
      .delete()
      .eq('player_id', playerId)

    if (deleteTeamsError) {
      console.error('❌ Ошибка удаления существующих команд:', deleteTeamsError)
      return new Response(
        JSON.stringify({ success: false, error: 'Ошибка удаления существующих команд' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 6. Добавляем новые команды
    if (allTeams.length === 0) {
      return new Response(
        JSON.stringify({ success: true }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const insertData = allTeams.map((team, index) => ({
      player_id: playerId,
      team_id: team.id,
      is_primary: team.isCurrent,
      joined_date: new Date().toISOString().split('T')[0],
      start_year: team.startYear,
      end_year: team.endYear,
      team_order: index
    }))

    const { error: insertError } = await supabase
      .from('player_teams')
      .insert(insertData)

    if (insertError) {
      console.error('❌ Ошибка добавления команд:', insertError)
      
      // Пытаемся восстановить старые команды
      if (oldTeamsData && oldTeamsData.length > 0) {
        const restoreData = oldTeamsData.map(team => ({
          player_id: team.player_id,
          team_id: team.team_id,
          is_primary: team.is_primary,
          joined_date: team.joined_date,
          start_year: team.start_year,
          end_year: team.end_year,
          team_order: team.team_order
        }))
        
        await supabase.from('player_teams').insert(restoreData)
      }
      
      return new Response(
        JSON.stringify({ success: false, error: 'Ошибка добавления команд: ' + insertError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('❌ Ошибка синхронизации команд:', error)
    return new Response(
      JSON.stringify({ success: false, error: error.message || 'Неизвестная ошибка' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})


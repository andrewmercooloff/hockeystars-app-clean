const { withDangerousMod, withPlugins } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

/**
 * Expo Config Plugin for Vision Motion Processor
 * Adds Vision and CoreML frameworks to iOS Podfile
 */
function withVisionMotionProcessor(config) {
  return withPlugins(config, [
    // Add iOS native dependencies
    withDangerousMod(config, [
      'ios',
      async (config) => {
        const podfilePath = path.join(config.modRequest.platformProjectRoot, 'Podfile');

        // Read existing Podfile
        let podfile = fs.readFileSync(podfilePath, 'utf-8');

        // Add Vision and CoreML pods if not already present
        if (!podfile.includes('pod \'Vision\'')) {
          // Find the main target section
          const targetMatch = podfile.match(/(target '[^']+' do[\s\S]*?end)/);
          if (targetMatch) {
            const targetBlock = targetMatch[1];

            // Add Vision and CoreML pods before the 'end' of the target block
            const updatedTargetBlock = targetBlock.replace(
              /(\s+end)$/,
              '\n  # Vision Motion Processor dependencies\n  pod \'Vision\'\n  pod \'CoreML\'\n$1'
            );

            podfile = podfile.replace(targetBlock, updatedTargetBlock);
          }
        }

        // Write updated Podfile
        fs.writeFileSync(podfilePath, podfile);

        return config;
      }
    ]),

    // Add native files to the project
    withDangerousMod(config, [
      'ios',
      async (config) => {
        const projectRoot = config.modRequest.projectRoot;
        const platformProjectRoot = config.modRequest.platformProjectRoot;

        // Copy Swift and Objective-C files
        const sourceDir = path.join(projectRoot, 'ios-motion-processor', 'src', 'ios');
        const targetDir = path.join(platformProjectRoot, 'VisionMotionProcessor');

        // Create target directory if it doesn't exist
        if (!fs.existsSync(targetDir)) {
          fs.mkdirSync(targetDir, { recursive: true });
        }

        // Copy files
        const files = ['VisionMotionProcessor.swift', 'VisionMotionProcessorBridge.m'];
        files.forEach(file => {
          const sourcePath = path.join(sourceDir, file);
          const targetPath = path.join(targetDir, file);

          if (fs.existsSync(sourcePath)) {
            fs.copyFileSync(sourcePath, targetPath);
            console.log(`✅ Copied ${file} to iOS project`);
          }
        });

        return config;
      }
    ])
  ]);
}

module.exports = withVisionMotionProcessor;

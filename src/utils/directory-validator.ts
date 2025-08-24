import fs from "fs-extra";
import path from "path";
import { logger } from "./logger";
import { CLIError } from "./error-handler";

export interface DirectoryValidationOptions {
  force?: boolean;
  dryRun?: boolean;
}

export async function validateProjectDirectory(
  projectName: string,
  options: DirectoryValidationOptions = {}
): Promise<string> {
  const { force = false, dryRun = false } = options;
  const projectPath = path.resolve(projectName);

  logger.verbose(`Validating project directory: ${projectPath}`);

  // Check if directory already exists
  const exists = await fs.pathExists(projectPath);

  if (exists) {
    const stat = await fs.stat(projectPath);

    if (!stat.isDirectory()) {
      throw new CLIError(
        `❌ A file with the name "${projectName}" already exists`
      );
    }

    // Check if directory is empty
    const files = await fs.readdir(projectPath);
    const nonHiddenFiles = files.filter((file) => !file.startsWith("."));

    if (nonHiddenFiles.length > 0) {
      if (force) {
        logger.warn(
          `⚠️  Directory "${projectName}" exists and is not empty. Using --force flag.`
        );
        if (!dryRun) {
          logger.verbose("Removing existing directory contents...");
          await fs.emptyDir(projectPath);
        }
      } else {
        logger.error(
          `❌ Directory "${projectName}" already exists and is not empty.`
        );
        logger.info("Options:");
        logger.info("  • Use --force to overwrite the existing directory");
        logger.info("  • Choose a different project name");
        logger.info("  • Remove the existing directory manually");
        throw new CLIError("Directory already exists", 1);
      }
    } else {
      logger.verbose("Directory exists but is empty, proceeding...");
    }
  } else {
    // Directory doesn't exist, create it
    if (!dryRun) {
      logger.verbose(`Creating directory: ${projectPath}`);
      await fs.ensureDir(projectPath);
    }
  }

  // Validate write permissions
  try {
    if (!dryRun) {
      const testFile = path.join(projectPath, ".write-test");
      await fs.writeFile(testFile, "test");
      await fs.remove(testFile);
    }
  } catch (error) {
    throw new CLIError(`❌ No write permission for directory: ${projectPath}`);
  }

  logger.verbose(`Directory validation completed: ${projectPath}`);
  return projectPath;
}

export async function checkDirectoryExists(dirPath: string): Promise<boolean> {
  try {
    const stat = await fs.stat(dirPath);
    return stat.isDirectory();
  } catch {
    return false;
  }
}

export async function isDirEmpty(dirPath: string): Promise<boolean> {
  try {
    const files = await fs.readdir(dirPath);
    return files.filter((file) => !file.startsWith(".")).length === 0;
  } catch {
    return true;
  }
}

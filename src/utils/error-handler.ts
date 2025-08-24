import fs from "fs-extra";
import path from "path";
import { logger } from "./logger";

export class CLIError extends Error {
  constructor(message: string, public exitCode: number = 1) {
    super(message);
    this.name = "CLIError";
  }
}

export async function cleanupProject(projectPath: string) {
  try {
    if (await fs.pathExists(projectPath)) {
      logger.verbose(
        `Cleaning up partially created project at: ${projectPath}`
      );
      await fs.remove(projectPath);
      logger.verbose("Cleanup completed");
    }
  } catch (error) {
    logger.warn(
      `Warning: Could not clean up project directory: ${projectPath}`
    );
  }
}

export function setupErrorHandling(projectName?: string) {
  const projectPath = projectName ? path.resolve(projectName) : null;

  // Handle uncaught exceptions
  process.on("uncaughtException", async (error) => {
    logger.error("Unexpected error occurred:");
    logger.error(error.message);
    logger.verbose(error.stack || "");

    if (projectPath) {
      await cleanupProject(projectPath);
    }

    logger.exitError();
  });

  // Handle unhandled promise rejections
  process.on("unhandledRejection", async (reason, promise) => {
    logger.error("Unhandled promise rejection:");
    logger.error(String(reason));

    if (projectPath) {
      await cleanupProject(projectPath);
    }

    logger.exitError();
  });

  // Handle Ctrl+C (SIGINT)
  process.on("SIGINT", async () => {
    logger.log("\n");
    logger.warn("Operation cancelled by user");

    if (projectPath) {
      await cleanupProject(projectPath);
    }

    logger.exitError("Operation cancelled");
  });

  // Handle SIGTERM
  process.on("SIGTERM", async () => {
    logger.warn("Process terminated");

    if (projectPath) {
      await cleanupProject(projectPath);
    }

    logger.exitError("Process terminated");
  });

  return {
    cleanup: () =>
      projectPath ? cleanupProject(projectPath) : Promise.resolve(),
  };
}

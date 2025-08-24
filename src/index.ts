#!/usr/bin/env node

import { Command } from "commander";
import inquirer from "inquirer";
import searchCheckbox from "inquirer-search-checkbox";
import chalk from "chalk";
import ora from "ora";
import { createNextJsApp } from "./templates/nextjs";
import { createViteApp } from "./templates/vite";
import { validateProjectName } from "./utils/validation";
import { getWalletChoices } from "./utils/wallet-providers";
import { detectPackageManager } from "./utils/package-manager";
import { logger, LogLevel } from "./utils/logger";
import { setupErrorHandling, CLIError } from "./utils/error-handler";
import { validateProjectDirectory } from "./utils/directory-validator";

// Register the search-checkbox plugin
inquirer.registerPrompt("search-checkbox", searchCheckbox);

const program = new Command();

program
  .name("create-privy-app")
  .description("CLI tool to create Next.js or Vite apps with Privy integration")
  .version("1.0.0")
  // Framework options with short flags
  .option("-n, --nextjs", "Create a Next.js app")
  .option("-v, --vite", "Create a Vite app")
  // Feature flags
  .option("-g, --global-wallets", "Include global wallet selection")
  .option(
    "-w, --wagmi",
    "Include Wagmi integration for advanced wallet functionality"
  )
  // Directory handling
  .option("-f, --force", "Overwrite existing directory")
  .option(
    "--dry-run",
    "Show what would be created without actually creating it"
  )
  // Logging levels
  .option("--verbose", "Show verbose output")
  .option("--quiet", "Show minimal output")
  .option("--silent", "Show no output except errors")
  .argument("[project-name]", "Name of the project")
  .addHelpText(
    "after",
    `
Examples:
  $ create-privy-app my-app
  $ create-privy-app my-app --nextjs --global-wallets
  $ create-privy-app my-app -v -w --force
  $ create-privy-app my-app --dry-run --verbose
  `
  )
  .parse();

async function main() {
  const options = program.opts();
  const projectNameArg = program.args[0];

  // Set logging level based on flags
  if (options.silent) logger.setLevel("silent");
  else if (options.quiet) logger.setLevel("quiet");
  else if (options.verbose) logger.setLevel("verbose");
  else logger.setLevel("normal");

  logger.verbose(
    `CLI started with options: ${JSON.stringify(options, null, 2)}`
  );

  // Validate conflicting flags
  if (options.nextjs && options.vite) {
    throw new CLIError("❌ Error: Cannot use both --nextjs and --vite flags");
  }

  if (options.dryRun) {
    logger.info(chalk.blue("🔍 DRY RUN MODE - No files will be created\n"));
  }

  logger.welcome();

  // Build dynamic prompt questions based on flags
  const questions: any[] = [];

  // Project name question (unless provided as argument)
  if (!projectNameArg) {
    questions.push({
      type: "input",
      name: "projectName",
      message: "What is your project name?",
      default: "my-privy-app",
      validate: validateProjectName,
    });
  }

  // Framework question (unless specified with flags)
  if (!options.nextjs && !options.vite) {
    questions.push({
      type: "list",
      name: "framework",
      message: "Which framework would you like to use?",
      choices: [
        { name: "Next.js", value: "nextjs" },
        { name: "Vite (React)", value: "vite" },
      ],
    });
  }

  // Always ask for Privy credentials
  questions.push(
    {
      type: "input",
      name: "privyAppId",
      message:
        "Enter your Privy App ID (optional - you can add it later to .env):",
      default: "",
    },
    {
      type: "input",
      name: "privyClientId",
      message:
        "Enter your Privy Client ID (optional - you can add it later to .env):",
      default: "",
    }
  );

  // Global wallets question (only if --global-wallets flag is used)
  if (options.globalWallets) {
    questions.push({
      type: "search-checkbox",
      name: "selectedWallets",
      message:
        "Choose global wallets to include (optional - type to search, space to select, enter to continue):",
      choices: getWalletChoices(),
      pageSize: 15,
      highlight: true,
      searchable: true,
    });
  }

  const answers = await inquirer.prompt(questions);

  // Set defaults based on flags and arguments
  const projectName = projectNameArg || answers.projectName;
  const framework = options.nextjs
    ? "nextjs"
    : options.vite
    ? "vite"
    : answers.framework;
  const selectedWallets = options.globalWallets
    ? answers.selectedWallets || []
    : [];

  // Validate project directory
  logger.verbose(`Validating project directory: ${projectName}`);
  const projectPath = await validateProjectDirectory(projectName, {
    force: options.force,
    dryRun: options.dryRun,
  });

  // Setup error handling with cleanup
  const { cleanup } = setupErrorHandling(projectName);

  // Detect the package manager used to invoke the CLI
  const packageManager = detectPackageManager();
  logger.info(
    chalk.blue(`📦 Detected package manager: ${packageManager.name}`)
  );

  if (options.dryRun) {
    logger.info(
      "\n" + chalk.yellow("📋 DRY RUN - Would create the following:")
    );
    logger.info(`  Project: ${projectName}`);
    logger.info(`  Framework: ${framework}`);
    logger.info(`  Package Manager: ${packageManager.name}`);
    logger.info(
      `  Global Wallets: ${
        selectedWallets.length > 0 ? selectedWallets.join(", ") : "None"
      }`
    );
    logger.info(`  Wagmi Integration: ${options.wagmi ? "Yes" : "No"}`);
    logger.info(`  Location: ${projectPath}`);
    logger.success("\n✅ Dry run completed successfully!");
    logger.exitSuccess();
  }

  const spinner = ora("Creating your project...").start();

  try {
    if (framework === "nextjs") {
      await createNextJsApp(
        projectName,
        spinner,
        answers.privyAppId,
        answers.privyClientId,
        selectedWallets,
        options.wagmi || false,
        options.globalWallets || false,
        packageManager
      );
    } else {
      await createViteApp(
        projectName,
        spinner,
        answers.privyAppId,
        answers.privyClientId,
        selectedWallets,
        options.wagmi || false,
        options.globalWallets || false,
        packageManager
      );
    }

    spinner.succeed("Project created successfully!");

    logger.celebration();
    logger.info(chalk.gray(`\nNext steps:`));
    logger.info(chalk.gray(`  1. cd ${projectName}`));

    const envFile = framework === "nextjs" ? ".env.local" : ".env";
    const hasCredentials = answers.privyAppId && answers.privyClientId;
    const runCommand = `${packageManager.runCommand} dev`;

    if (hasCredentials) {
      logger.info(chalk.gray(`  2. ${runCommand}`));
      logger.success(
        `\n✅ Your Privy credentials have been automatically configured!`
      );
    } else {
      logger.info(
        chalk.gray(`  2. Update your Privy credentials in ${envFile}`)
      );
      logger.info(chalk.gray(`  3. ${runCommand}`));
      logger.info(
        chalk.blue(
          `\n🔑 Don't forget to add your Privy App ID and Client ID to ${envFile}!`
        )
      );
      logger.info(chalk.gray(`   Get them from: https://dashboard.privy.io`));
    }

    // Show global wallets note if any were selected
    if (selectedWallets.length > 0) {
      logger.warn(
        `\n⚠️  Important: You selected ${selectedWallets.length} global wallet(s).`
      );
      logger.warn(
        `   Enable them in your Privy dashboard: https://dashboard.privy.io/apps?tab=integrations&page=ecosystem`
      );
    }

    logger.exitSuccess();
  } catch (error) {
    spinner.fail("Failed to create project");

    if (error instanceof CLIError) {
      logger.error(error.message);
      await cleanup();
      process.exit(error.exitCode);
    } else {
      logger.error(
        `Unexpected error: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
      logger.verbose(error instanceof Error && error.stack ? error.stack : "");
      await cleanup();
      logger.exitError();
    }
  }
}

if (require.main === module) {
  main().catch((error) => {
    if (error instanceof CLIError) {
      logger.error(error.message);
      process.exit(error.exitCode);
    } else {
      logger.error("An unexpected error occurred:");
      logger.error(error.message);
      logger.verbose(error.stack || "");
      process.exit(1);
    }
  });
}

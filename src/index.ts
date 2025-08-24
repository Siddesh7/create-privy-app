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

// Register the search-checkbox plugin
inquirer.registerPrompt("search-checkbox", searchCheckbox);

const program = new Command();

program
  .name("create-privy-app")
  .description("CLI tool to create Next.js or Vite apps with Privy integration")
  .version("1.0.0")
  .option("--nextjs", "Create a Next.js app")
  .option("--vite", "Create a Vite app")
  .option("--global-wallets", "Include global wallet selection")
  .option(
    "--wagmi",
    "Include Wagmi integration for advanced wallet functionality"
  )
  .argument("[project-name]", "Name of the project")
  .parse();

async function main() {
  const options = program.opts();
  const projectNameArg = program.args[0];

  // Validate conflicting flags
  if (options.nextjs && options.vite) {
    console.error(
      chalk.red("❌ Error: Cannot use both --nextjs and --vite flags")
    );
    process.exit(1);
  }

  console.log(chalk.blue.bold("\n🔐 Welcome to Create Privy App!\n"));

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

  const spinner = ora("Creating your project...").start();

  try {
    if (framework === "nextjs") {
      await createNextJsApp(
        projectName,
        spinner,
        answers.privyAppId,
        answers.privyClientId,
        selectedWallets,
        options.wagmi || false
      );
    } else {
      await createViteApp(
        projectName,
        spinner,
        answers.privyAppId,
        answers.privyClientId,
        selectedWallets,
        options.wagmi || false
      );
    }

    spinner.succeed(chalk.green("Project created successfully!"));

    console.log(chalk.blue("\n🎉 Your Privy powered app is ready!"));
    console.log(chalk.gray(`\nNext steps:`));
    console.log(chalk.gray(`  1. cd ${projectName}`));

    const envFile = framework === "nextjs" ? ".env.local" : ".env";
    const hasCredentials = answers.privyAppId && answers.privyClientId;

    if (hasCredentials) {
      console.log(chalk.gray(`  2. pnpm dev`));
      console.log(
        chalk.blue(
          `\n✅ Your Privy credentials have been automatically configured!`
        )
      );
    } else {
      console.log(
        chalk.gray(`  2. Update your Privy credentials in ${envFile}`)
      );
      console.log(chalk.gray(`  3. pnpm dev`));
      console.log(
        chalk.blue(
          `\n🔑 Don't forget to add your Privy App ID and Client ID to ${envFile}!`
        )
      );
      console.log(chalk.gray(`   Get them from: https://dashboard.privy.io`));
    }

    // Show global wallets note if any were selected
    if (selectedWallets.length > 0) {
      console.log(
        chalk.yellow(
          `\n⚠️  Important: You selected ${selectedWallets.length} global wallet(s).`
        )
      );
      console.log(
        chalk.yellow(
          `   Enable them in your Privy dashboard: https://dashboard.privy.io/apps?tab=integrations&page=ecosystem`
        )
      );
    }
  } catch (error) {
    spinner.fail(chalk.red("Failed to create project"));
    console.error(
      chalk.red(error instanceof Error ? error.message : "Unknown error")
    );
    process.exit(1);
  }
}

if (require.main === module) {
  main().catch((error) => {
    console.error(chalk.red("An unexpected error occurred:"), error);
    process.exit(1);
  });
}

#!/usr/bin/env node

import inquirer from "inquirer";
import chalk from "chalk";
import ora from "ora";
import { createNextJsApp } from "./templates/nextjs";
import { createViteApp } from "./templates/vite";
import { validateProjectName } from "./utils/validation";

async function main() {
  console.log(chalk.blue.bold("\n🔐 Welcome to Create Privy App!\n"));

  const answers = await inquirer.prompt([
    {
      type: "input",
      name: "projectName",
      message: "What is your project name?",
      default: "my-privy-app",
      validate: validateProjectName,
    },
    {
      type: "list",
      name: "framework",
      message: "Which framework would you like to use?",
      choices: [
        { name: "Next.js", value: "nextjs" },
        { name: "Vite (React)", value: "vite" },
      ],
    },
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
    },
  ]);

  const spinner = ora("Creating your project...").start();

  try {
    if (answers.framework === "nextjs") {
      await createNextJsApp(
        answers.projectName,
        spinner,
        answers.privyAppId,
        answers.privyClientId
      );
    } else {
      await createViteApp(
        answers.projectName,
        spinner,
        answers.privyAppId,
        answers.privyClientId
      );
    }

    spinner.succeed(chalk.green("Project created successfully!"));

    console.log(chalk.blue("\n🎉 Your Privy-enabled app is ready!"));
    console.log(chalk.gray(`\nNext steps:`));
    console.log(chalk.gray(`  1. cd ${answers.projectName}`));

    const envFile = answers.framework === "nextjs" ? ".env.local" : ".env";
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

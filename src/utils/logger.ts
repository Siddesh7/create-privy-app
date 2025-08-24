import chalk from "chalk";

export type LogLevel = "silent" | "quiet" | "normal" | "verbose";

export class Logger {
  private level: LogLevel = "normal";

  setLevel(level: LogLevel) {
    this.level = level;
  }

  // Standard output (stdout)
  info(message: string) {
    if (this.level === "silent") return;
    console.log(message);
  }

  // Success messages (stdout)
  success(message: string) {
    if (this.level === "silent") return;
    console.log(chalk.green(message));
  }

  // Warning messages (stderr)
  warn(message: string) {
    if (this.level === "silent") return;
    console.warn(chalk.yellow(message));
  }

  // Error messages (stderr)
  error(message: string) {
    if (this.level === "silent") return;
    console.error(chalk.red(message));
  }

  // Verbose messages (stdout) - only shown in verbose mode
  verbose(message: string) {
    if (this.level !== "verbose") return;
    console.log(chalk.gray(`[VERBOSE] ${message}`));
  }

  // Debug messages (stdout) - only shown in verbose mode
  debug(message: string) {
    if (this.level !== "verbose") return;
    console.log(chalk.dim(`[DEBUG] ${message}`));
  }

  // Always shown unless silent
  log(message: string) {
    if (this.level === "silent") return;
    console.log(message);
  }

  // Branded messages
  welcome() {
    if (this.level === "silent" || this.level === "quiet") return;
    console.log(chalk.blue.bold("\n🔐 Welcome to Create Privy App!\n"));
  }

  celebration() {
    if (this.level === "silent" || this.level === "quiet") return;
    console.log(chalk.blue("\n🎉 Your Privy powered app is ready!"));
  }

  // Exit with proper codes
  exitSuccess() {
    process.exit(0);
  }

  exitError(message?: string) {
    if (message) this.error(message);
    process.exit(1);
  }
}

export const logger = new Logger();

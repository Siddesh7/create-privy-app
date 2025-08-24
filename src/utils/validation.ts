export function validateProjectName(name: string): boolean | string {
  if (!name || name.trim().length === 0) {
    return 'Project name cannot be empty';
  }

  if (name.includes(' ')) {
    return 'Project name cannot contain spaces';
  }

  if (!/^[a-zA-Z0-9-_]+$/.test(name)) {
    return 'Project name can only contain letters, numbers, hyphens, and underscores';
  }

  if (name.startsWith('-') || name.startsWith('_')) {
    return 'Project name cannot start with a hyphen or underscore';
  }

  return true;
}

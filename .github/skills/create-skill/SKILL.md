---
name: create-skill
user-invocable: true
description: "Guide for creating a new VS Code Copilot workspace skill file (SKILL.md), including scope, structure, and validation checks."
---

# Create Skill

## Purpose

Help authors create a new VS Code Copilot skill file (`SKILL.md`) for project-specific or personal agent customizations.

## When to Use

- You need to add a new workflow-oriented skill to a workspace.
- You want a reusable guide for creating `SKILL.md` files with correct frontmatter and location.
- You want to choose between workspace vs user-level customization.

## What This Skill Produces

- A skill file template with required YAML frontmatter.
- A clear workflow for selecting scope, naming the skill, and writing descriptions.
- A validation checklist to ensure the new skill loads correctly.

## Workflow

1. Confirm the desired outcome.
   - What should the skill do?
   - Who should use it: team/project or just you?
2. Choose scope.
   - Workspace: `.github/skills/<name>/SKILL.md`
   - User: `{{VSCODE_USER_PROMPTS_FOLDER}}/` (for prompts and instructions; skills remain workspace-scoped)
3. Choose a name.
   - Use a short, descriptive identifier that matches the folder name.
4. Define frontmatter.
   - `name`: unique skill name
   - `user-invocable`: `true` if the user should be able to call it directly
   - `description`: concise and keyword-rich
5. Write the body.
   - Explain purpose, when to use it, and any steps or decision logic.
   - Include examples or related commands if helpful.
6. Validate.
   - Ensure YAML is properly formatted.
   - Confirm the file path is correct.
   - Check the description includes trigger phrases.

## Validation Checklist

- [ ] File exists at `.github/skills/<name>/SKILL.md`
- [ ] Frontmatter contains `name`, `user-invocable`, and `description`
- [ ] Description is quoted if needed
- [ ] Body explains the workflow and expected result
- [ ] The skill name matches the containing folder name

## Example Prompts

- `/create-skill` — start a new SKILL.md creation workflow
- `Create a workspace skill for adding coding style rules`
- `Make a SKILL.md that helps teammates set up new project guidance`

## Next Steps

- Add a matching `.instructions.md` if you want the agent to apply guidance automatically for certain file types.
- Create a `*.prompt.md` file if you want a simpler input-driven prompt instead of a full workflow skill.

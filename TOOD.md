# Features
- [x] support multiple environments.
- [x] support multiple projects.
- [x] support multiple users.
- [x] support multiple folders inside project.
- [x] ability to copy/paste steps.
- [x] ability to duplicate flows.
- [x] ability to export flows as json.
- [x] ability to import flows from json.
- [x] ability to edit environment variables.
- [x] ability to show environment secrets.
- [x] ability to hide environment secrets.
- [x] dark mode
- [x] make the design looks modern and attractive.
- [x] add animations to the design, make it look sleeky and fashionable.
- [x] add more icons to the design.
- [x] add more colors to the design.
- [x] use mongodb instead of sqlite.
- [x] autosave functionality.
- [x] add right click menu to steps for duplicate, delete, copy, paste.
- [x] multi-tenants, each tenant can invite users. and create teams, the projects permissions is related to teams, and the users are related to teams.
- [x] add sql query step.
- [ ] ability to export and import entire project.
- [ ] ability to export and import entire organization.
- [ ] ability to export and import entire environment.

# Bugs
- [x] nothing happens when clicking on show test runs.
- [x] STEP ID is not visible.
- [x] Can't write into headers or body fields
- [x] there is no option to edit environment variables.
- [x] can't find projects or folders.
- [x] can't view test runs details.
- [x] i can add / remove environment variables but can't edit existing ones.
- [x] i can not edit environment variable name.
- [x] expanding step execution results do nothing.
- [x] test run status success while there is a failed step.
- [x] HTTP Request: Step not executed yet
- [x] Drag and drop steps from step menu to flow editor not working.
- [x] can't run single or selected steps
- [x] running flows only run the last step.
- [x] after click run step, i got test run started, but nothing happens and can't see the results for the steps.
- [x] when running step which have environment variables in the url, i got error Error: Invalid URL
- [x] i got "Failed to run step" without knowing what actually happened, it should show the error message for each step.
- [x] can't see the output of sql step inside the step
- [x] Nothing happens after click submit to create an organization.
- [x] URL contains unresolved variables: {{baseUrl}}



# TODOs
- [x] folders should be always visible under project, also if the project have flows without folders.
- [x] ability to rename folders.
- [x] drag and drop flows between folders and projects.
- [x] add copy buttons to be able to copy environment varible name or value.
- [x] ability to run flow from the flow details, or run only selected steps.
- [x] ability to delete flows.
- [x] ability to delete steps.
- [x] runnign the flow or single steps from flow details page should show the result of each step on the step itself
- [x] add run button to step right click menu to run this step
- [ ] split the step results into tabs

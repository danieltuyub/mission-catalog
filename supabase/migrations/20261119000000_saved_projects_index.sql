-- Saving a project: the table and its policies already exist (20261118: own rows only, insert
-- needs `projects.save`). This index lets a project's saves be counted and listed without
-- scanning the table (creators will see how many and who saved theirs); the primary key
-- (user_id, project_id) only serves lookups by user.
create index if not exists saved_projects_project_idx on public.saved_projects (project_id);

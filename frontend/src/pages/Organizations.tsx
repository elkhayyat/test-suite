import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  Card,
  CardContent,
  CardActions,
  Grid,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Chip,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Tabs,
  Tab,
  Divider,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import GroupIcon from '@mui/icons-material/Group';
import BusinessIcon from '@mui/icons-material/Business';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import DownloadIcon from '@mui/icons-material/Download';
import UploadIcon from '@mui/icons-material/Upload';
import { Organization, Team, TeamUser, User, Project, ProjectTeam } from '../../../shared/src/types';
import { api } from '../services/api';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`tabpanel-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

export default function Organizations() {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [selectedOrg, setSelectedOrg] = useState<Organization | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [teamUsers, setTeamUsers] = useState<TeamUser[]>([]);
  const [projectTeams, setProjectTeams] = useState<ProjectTeam[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [tabValue, setTabValue] = useState(0);
  
  // Dialog states
  const [orgDialogOpen, setOrgDialogOpen] = useState(false);
  const [teamDialogOpen, setTeamDialogOpen] = useState(false);
  const [userDialogOpen, setUserDialogOpen] = useState(false);
  const [projectTeamDialogOpen, setProjectTeamDialogOpen] = useState(false);
  
  // Form states
  const [orgForm, setOrgForm] = useState<Partial<Organization>>({ name: '', description: '' });
  const [teamForm, setTeamForm] = useState<Partial<Team>>({ name: '', description: '' });
  const [userForm, setUserForm] = useState({ userId: '', role: 'member' as TeamUser['role'] });
  const [projectTeamForm, setProjectTeamForm] = useState({ projectId: '', permissions: 'read' as ProjectTeam['permissions'] });
  const [importingOrgId, setImportingOrgId] = useState<string>('');

  useEffect(() => {
    loadOrganizations();
    loadProjects();
    // TODO: Load users from a user management endpoint
  }, []);

  useEffect(() => {
    if (selectedOrg) {
      loadTeams(selectedOrg.id);
    }
  }, [selectedOrg]);

  useEffect(() => {
    if (selectedTeam) {
      loadTeamUsers(selectedTeam);
      loadProjectTeams(selectedTeam);
    }
  }, [selectedTeam]);

  const loadOrganizations = async () => {
    try {
      const orgs = await api.getOrganizations();
      setOrganizations(orgs);
      if (orgs.length > 0 && !selectedOrg) {
        setSelectedOrg(orgs[0]);
      }
    } catch (error) {
      console.error('Failed to load organizations:', error);
    }
  };

  const loadTeams = async (orgId: string) => {
    try {
      const teams = await api.getTeams(orgId);
      setTeams(teams);
    } catch (error) {
      console.error('Failed to load teams:', error);
    }
  };

  const loadTeamUsers = async (team: Team) => {
    try {
      const users = await api.getTeamUsers(team.organizationId, team.id);
      setTeamUsers(users);
    } catch (error) {
      console.error('Failed to load team users:', error);
    }
  };

  const loadProjectTeams = async (team: Team) => {
    try {
      // Get all projects and filter those associated with this team
      const allProjects = await api.getProjects();
      const projectTeamPromises = allProjects.map(p => api.getProjectTeams(p.id));
      const allProjectTeams = await Promise.all(projectTeamPromises);
      
      const teamProjects: ProjectTeam[] = [];
      allProjectTeams.forEach((pts, index) => {
        const teamProject = pts.find(pt => pt.teamId === team.id);
        if (teamProject) {
          teamProjects.push(teamProject);
        }
      });
      
      setProjectTeams(teamProjects);
    } catch (error) {
      console.error('Failed to load project teams:', error);
    }
  };

  const loadProjects = async () => {
    try {
      const projects = await api.getProjects();
      setProjects(projects);
    } catch (error) {
      console.error('Failed to load projects:', error);
    }
  };

  const handleCreateOrganization = async () => {
    try {
      console.log('Creating organization with form data:', orgForm);
      const newOrg = await api.createOrganization(orgForm);
      console.log('Organization created successfully:', newOrg);
      setOrganizations([...organizations, newOrg]);
      setOrgDialogOpen(false);
      setOrgForm({ name: '', description: '' });
      // TODO: Show success message
    } catch (error: any) {
      console.error('Failed to create organization:', error);
      const errorMessage = error.response?.data?.details || error.response?.data?.error || error.message || 'Unknown error';
      alert(`Failed to create organization: ${errorMessage}`);
    }
  };

  const handleCreateTeam = async () => {
    if (!selectedOrg) return;
    try {
      const newTeam = await api.createTeam(selectedOrg.id, teamForm);
      setTeams([...teams, newTeam]);
      setTeamDialogOpen(false);
      setTeamForm({ name: '', description: '' });
    } catch (error) {
      console.error('Failed to create team:', error);
    }
  };

  const handleAddUserToTeam = async () => {
    if (!selectedOrg || !selectedTeam) return;
    try {
      const newTeamUser = await api.addUserToTeam(
        selectedOrg.id,
        selectedTeam.id,
        userForm.userId,
        userForm.role as TeamUser['role']
      );
      setTeamUsers([...teamUsers, newTeamUser]);
      setUserDialogOpen(false);
      setUserForm({ userId: '', role: 'member' });
    } catch (error) {
      console.error('Failed to add user to team:', error);
    }
  };

  const handleAddProjectToTeam = async () => {
    if (!selectedTeam) return;
    try {
      const newProjectTeam = await api.addTeamToProject(
        projectTeamForm.projectId,
        selectedTeam.id,
        projectTeamForm.permissions as ProjectTeam['permissions']
      );
      setProjectTeams([...projectTeams, newProjectTeam]);
      setProjectTeamDialogOpen(false);
      setProjectTeamForm({ projectId: '', permissions: 'read' });
    } catch (error) {
      console.error('Failed to add project to team:', error);
    }
  };

  const handleDeleteOrganization = async (org: Organization) => {
    if (!window.confirm(`Are you sure you want to delete "${org.name}"?`)) return;
    try {
      await api.deleteOrganization(org.id);
      setOrganizations(organizations.filter(o => o.id !== org.id));
      if (selectedOrg?.id === org.id) {
        setSelectedOrg(null);
      }
    } catch (error) {
      console.error('Failed to delete organization:', error);
    }
  };

  const handleDeleteTeam = async (team: Team) => {
    if (!window.confirm(`Are you sure you want to delete "${team.name}"?`)) return;
    try {
      await api.deleteTeam(team.organizationId, team.id);
      setTeams(teams.filter(t => t.id !== team.id));
      if (selectedTeam?.id === team.id) {
        setSelectedTeam(null);
      }
    } catch (error) {
      console.error('Failed to delete team:', error);
    }
  };

  const handleRemoveUserFromTeam = async (userId: string) => {
    if (!selectedOrg || !selectedTeam) return;
    try {
      await api.removeUserFromTeam(selectedOrg.id, selectedTeam.id, userId);
      setTeamUsers(teamUsers.filter(tu => tu.userId !== userId));
    } catch (error) {
      console.error('Failed to remove user from team:', error);
    }
  };

  const handleRemoveProjectFromTeam = async (projectId: string) => {
    if (!selectedTeam) return;
    try {
      await api.removeTeamFromProject(projectId, selectedTeam.id);
      setProjectTeams(projectTeams.filter(pt => pt.projectId !== projectId));
    } catch (error) {
      console.error('Failed to remove project from team:', error);
    }
  };

  const handleExportOrganization = async (orgId: string, orgName: string) => {
    try {
      const exportData = await api.exportOrganization(orgId);
      
      const dataStr = JSON.stringify(exportData, null, 2);
      const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
      
      const exportFileDefaultName = `${orgName.replace(/[^a-z0-9]/gi, '_')}_organization.json`;
      
      const linkElement = document.createElement('a');
      linkElement.setAttribute('href', dataUri);
      linkElement.setAttribute('download', exportFileDefaultName);
      linkElement.click();
    } catch (error) {
      console.error('Failed to export organization:', error);
      alert('Failed to export organization');
    }
  };

  const handleImportOrganization = (orgId: string) => {
    setImportingOrgId(orgId);
    const fileInput = document.getElementById(`import-org-input-${orgId}`) as HTMLInputElement;
    fileInput?.click();
  };

  const handleImportOrgFile = async (event: React.ChangeEvent<HTMLInputElement>, orgId: string) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const importData = JSON.parse(e.target?.result as string);
          await api.importOrganization(orgId, importData);
          alert('Organization imported successfully!');
          loadOrganizations();
          if (selectedOrg) {
            loadTeams(selectedOrg.id);
          }
        } catch (error) {
          console.error('Failed to import organization:', error);
          alert('Failed to import organization. Please check the file format.');
        }
      };
      reader.readAsText(file);
    } catch (error) {
      console.error('Failed to read import file:', error);
      alert('Failed to read the import file.');
    }
    
    // Reset the input
    event.target.value = '';
    setImportingOrgId('');
  };

  return (
    <Box>
      <Typography variant="h4" sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 1 }}>
        <BusinessIcon className="gradient-primary" sx={{ fontSize: 32, color: 'white', p: 0.5, borderRadius: 1 }} />
        Organizations & Teams
      </Typography>

      <Grid container spacing={3}>
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6">Organizations</Typography>
              <Button
                startIcon={<AddIcon />}
                variant="contained"
                size="small"
                onClick={() => setOrgDialogOpen(true)}
                className="gradient-primary"
                sx={{ color: 'white' }}
              >
                New
              </Button>
            </Box>
            <List>
              {organizations.map((org) => (
                <ListItem
                  key={org.id}
                  button
                  selected={selectedOrg?.id === org.id}
                  onClick={() => setSelectedOrg(org)}
                  sx={{
                    borderRadius: 1,
                    mb: 1,
                    '&.Mui-selected': {
                      backgroundColor: 'primary.main',
                      color: 'white',
                      '&:hover': {
                        backgroundColor: 'primary.dark',
                      },
                    },
                  }}
                >
                  <ListItemText
                    primary={org.name}
                    secondary={org.description}
                    secondaryTypographyProps={{
                      sx: selectedOrg?.id === org.id ? { color: 'white' } : {},
                    }}
                  />
                  <ListItemSecondaryAction>
                    <IconButton
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleExportOrganization(org.id, org.name);
                      }}
                      title="Export Organization"
                    >
                      <DownloadIcon />
                    </IconButton>
                    <IconButton
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleImportOrganization(org.id);
                      }}
                      title="Import to Organization"
                    >
                      <UploadIcon />
                    </IconButton>
                    <IconButton
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteOrganization(org);
                      }}
                      title="Delete Organization"
                    >
                      <DeleteIcon />
                    </IconButton>
                  </ListItemSecondaryAction>
                </ListItem>
              ))}
            </List>
          </Paper>
        </Grid>

        <Grid item xs={12} md={8}>
          {selectedOrg && (
            <Paper sx={{ p: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6">Teams in {selectedOrg.name}</Typography>
                <Button
                  startIcon={<AddIcon />}
                  variant="contained"
                  size="small"
                  onClick={() => setTeamDialogOpen(true)}
                  className="gradient-success"
                  sx={{ color: 'white' }}
                >
                  New Team
                </Button>
              </Box>

              <Grid container spacing={2}>
                {teams.map((team) => (
                  <Grid item xs={12} sm={6} key={team.id}>
                    <Card
                      className="animate-fadeIn hover-lift"
                      sx={{
                        cursor: 'pointer',
                        border: selectedTeam?.id === team.id ? '2px solid' : '1px solid',
                        borderColor: selectedTeam?.id === team.id ? 'primary.main' : 'divider',
                      }}
                      onClick={() => setSelectedTeam(team)}
                    >
                      <CardContent>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                          <GroupIcon color="primary" />
                          <Typography variant="h6">{team.name}</Typography>
                        </Box>
                        <Typography variant="body2" color="text.secondary">
                          {team.description || 'No description'}
                        </Typography>
                      </CardContent>
                      <CardActions>
                        <Button size="small" startIcon={<EditIcon />}>
                          Edit
                        </Button>
                        <Button
                          size="small"
                          color="error"
                          startIcon={<DeleteIcon />}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteTeam(team);
                          }}
                        >
                          Delete
                        </Button>
                      </CardActions>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            </Paper>
          )}
        </Grid>
      </Grid>

      {selectedTeam && (
        <Paper sx={{ mt: 3, p: 2 }}>
          <Typography variant="h6" sx={{ mb: 2 }}>
            Team: {selectedTeam.name}
          </Typography>
          <Tabs value={tabValue} onChange={(_, v) => setTabValue(v)}>
            <Tab label="Members" />
            <Tab label="Projects" />
          </Tabs>
          <Divider />

          <TabPanel value={tabValue} index={0}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="subtitle1">Team Members</Typography>
              <Button
                startIcon={<PersonAddIcon />}
                variant="outlined"
                size="small"
                onClick={() => setUserDialogOpen(true)}
              >
                Add Member
              </Button>
            </Box>
            <List>
              {teamUsers.map((tu) => (
                <ListItem key={tu.id}>
                  <ListItemText
                    primary={tu.userId}
                    secondary={
                      <Chip
                        label={tu.role}
                        size="small"
                        color={tu.role === 'owner' ? 'error' : tu.role === 'admin' ? 'warning' : 'default'}
                      />
                    }
                  />
                  <ListItemSecondaryAction>
                    <IconButton
                      size="small"
                      onClick={() => handleRemoveUserFromTeam(tu.userId)}
                    >
                      <DeleteIcon />
                    </IconButton>
                  </ListItemSecondaryAction>
                </ListItem>
              ))}
            </List>
          </TabPanel>

          <TabPanel value={tabValue} index={1}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="subtitle1">Project Access</Typography>
              <Button
                startIcon={<AddIcon />}
                variant="outlined"
                size="small"
                onClick={() => setProjectTeamDialogOpen(true)}
              >
                Add Project
              </Button>
            </Box>
            <List>
              {projectTeams.map((pt) => {
                const project = projects.find(p => p.id === pt.projectId);
                return (
                  <ListItem key={pt.id}>
                    <ListItemText
                      primary={project?.name || pt.projectId}
                      secondary={
                        <Chip
                          label={pt.permissions}
                          size="small"
                          color={pt.permissions === 'admin' ? 'error' : pt.permissions === 'write' ? 'warning' : 'default'}
                        />
                      }
                    />
                    <ListItemSecondaryAction>
                      <IconButton
                        size="small"
                        onClick={() => handleRemoveProjectFromTeam(pt.projectId)}
                      >
                        <DeleteIcon />
                      </IconButton>
                    </ListItemSecondaryAction>
                  </ListItem>
                );
              })}
            </List>
          </TabPanel>
        </Paper>
      )}

      {/* Create Organization Dialog */}
      <Dialog open={orgDialogOpen} onClose={() => setOrgDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Create Organization</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="Name"
            value={orgForm.name}
            onChange={(e) => setOrgForm({ ...orgForm, name: e.target.value })}
            margin="normal"
          />
          <TextField
            fullWidth
            label="Description"
            value={orgForm.description}
            onChange={(e) => setOrgForm({ ...orgForm, description: e.target.value })}
            margin="normal"
            multiline
            rows={3}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOrgDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleCreateOrganization} variant="contained">Create</Button>
        </DialogActions>
      </Dialog>

      {/* Create Team Dialog */}
      <Dialog open={teamDialogOpen} onClose={() => setTeamDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Create Team</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="Name"
            value={teamForm.name}
            onChange={(e) => setTeamForm({ ...teamForm, name: e.target.value })}
            margin="normal"
          />
          <TextField
            fullWidth
            label="Description"
            value={teamForm.description}
            onChange={(e) => setTeamForm({ ...teamForm, description: e.target.value })}
            margin="normal"
            multiline
            rows={3}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTeamDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleCreateTeam} variant="contained">Create</Button>
        </DialogActions>
      </Dialog>

      {/* Add User Dialog */}
      <Dialog open={userDialogOpen} onClose={() => setUserDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Add Team Member</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="User Email"
            value={userForm.userId}
            onChange={(e) => setUserForm({ ...userForm, userId: e.target.value })}
            margin="normal"
          />
          <FormControl fullWidth margin="normal">
            <InputLabel>Role</InputLabel>
            <Select
              value={userForm.role}
              onChange={(e) => setUserForm({ ...userForm, role: e.target.value as TeamUser['role'] })}
              label="Role"
            >
              <MenuItem value="viewer">Viewer</MenuItem>
              <MenuItem value="member">Member</MenuItem>
              <MenuItem value="admin">Admin</MenuItem>
              <MenuItem value="owner">Owner</MenuItem>
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setUserDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleAddUserToTeam} variant="contained">Add</Button>
        </DialogActions>
      </Dialog>

      {/* Add Project Dialog */}
      <Dialog open={projectTeamDialogOpen} onClose={() => setProjectTeamDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Add Project Access</DialogTitle>
        <DialogContent>
          <FormControl fullWidth margin="normal">
            <InputLabel>Project</InputLabel>
            <Select
              value={projectTeamForm.projectId}
              onChange={(e) => setProjectTeamForm({ ...projectTeamForm, projectId: e.target.value })}
              label="Project"
            >
              {projects.map((project) => (
                <MenuItem key={project.id} value={project.id}>
                  {project.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl fullWidth margin="normal">
            <InputLabel>Permissions</InputLabel>
            <Select
              value={projectTeamForm.permissions}
              onChange={(e) => setProjectTeamForm({ ...projectTeamForm, permissions: e.target.value as ProjectTeam['permissions'] })}
              label="Permissions"
            >
              <MenuItem value="read">Read</MenuItem>
              <MenuItem value="write">Write</MenuItem>
              <MenuItem value="admin">Admin</MenuItem>
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setProjectTeamDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleAddProjectToTeam} variant="contained">Add</Button>
        </DialogActions>
      </Dialog>

      {/* Hidden file inputs for importing */}
      {organizations.map((org) => (
        <input
          key={org.id}
          id={`import-org-input-${org.id}`}
          type="file"
          accept=".json"
          style={{ display: 'none' }}
          onChange={(e) => handleImportOrgFile(e, org.id)}
        />
      ))}
    </Box>
  );
}
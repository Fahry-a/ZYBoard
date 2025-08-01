import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Paper,
  Grid,
  Typography,
  Button,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Stack,
  Chip,
  Divider,
  Alert,
  Snackbar,
  CircularProgress,
  Menu,
  MenuItem,
  Card,
  CardContent,
  Avatar,
  AvatarGroup,
  Breadcrumbs,
  Link,
  Tabs,
  Tab,
  Select,
  FormControl,
  InputLabel,
  Box as MuiBox,
} from '@mui/material';
import {
  Group,
  PersonAdd,
  Edit,
  Delete,
  MoreVert,
  Admin,
  Person,
  Email,
  Search,
  Add,
  Home,
  Settings,
  People,
  SupervisorAccount,
  Close,
  Send,
} from '@mui/icons-material';
import GroupIcon from '@mui/icons-material/Group';
const TeamsPage = ({ user, onBack }) => {
  const [teams, setTeams] = useState([]);
  const [teamMembers, setTeamMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [createTeamDialog, setCreateTeamDialog] = useState(false);
  const [inviteMemberDialog, setInviteMemberDialog] = useState(false);
  const [editTeamDialog, setEditTeamDialog] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [tabValue, setTabValue] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [menuAnchor, setMenuAnchor] = useState(null);
  const [selectedMember, setSelectedMember] = useState(null);
  const [formData, setFormData] = useState({
    teamName: '',
    description: '',
    memberEmail: '',
    memberRole: 'member',
  });

  const API_BASE = 'http://localhost:3030/api';

  // Get auth headers
  const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    };
  };

  // Show snackbar message
  const showMessage = (message, severity = 'success') => {
    setSnackbar({ open: true, message, severity });
  };

  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchTeams(),
        fetchTeamMembers(),
      ]);
    } catch (error) {
      console.error('Error fetching data:', error);
      showMessage('Error loading team data', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchTeams = async () => {
    try {
      // Simulate API call - replace with actual API endpoint
      const mockTeams = [
        {
          id: 1,
          name: 'Development Team',
          description: 'Main development team for ZYBoard',
          created_by: user?.id,
          member_count: 5,
          created_at: new Date().toISOString(),
        },
        {
          id: 2,
          name: 'Design Team',
          description: 'UI/UX design team',
          created_by: user?.id,
          member_count: 3,
          created_at: new Date().toISOString(),
        },
      ];
      setTeams(mockTeams);
    } catch (error) {
      console.error('Error fetching teams:', error);
    }
  };

  const fetchTeamMembers = async () => {
    try {
      const response = await fetch(`${API_BASE}/team/members`, {
        headers: getAuthHeaders(),
      });

      if (response.ok) {
        const data = await response.json();
        // Add mock members if API returns empty
        const mockMembers = data.members?.length > 0 ? data.members : [
          {
            id: 1,
            username: user?.username || 'Current User',
            email: user?.email || 'user@example.com',
            role: 'admin',
            team_id: 1,
            joined_at: new Date().toISOString(),
          },
          {
            id: 2,
            username: 'John Doe',
            email: 'john@example.com',
            role: 'member',
            team_id: 1,
            joined_at: new Date().toISOString(),
          },
          {
            id: 3,
            username: 'Jane Smith',
            email: 'jane@example.com',
            role: 'member',
            team_id: 2,
            joined_at: new Date().toISOString(),
          },
        ];
        setTeamMembers(mockMembers);
      }
    } catch (error) {
      console.error('Error fetching team members:', error);
    }
  };

  const handleCreateTeam = async () => {
    if (!formData.teamName.trim()) {
      showMessage('Team name is required', 'error');
      return;
    }

    try {
      // Simulate API call
      const newTeam = {
        id: teams.length + 1,
        name: formData.teamName,
        description: formData.description,
        created_by: user?.id,
        member_count: 1,
        created_at: new Date().toISOString(),
      };

      setTeams([...teams, newTeam]);
      setCreateTeamDialog(false);
      setFormData({ ...formData, teamName: '', description: '' });
      showMessage('Team created successfully!');
    } catch (error) {
      console.error('Error creating team:', error);
      showMessage('Error creating team', 'error');
    }
  };

  const handleInviteMember = async () => {
    if (!formData.memberEmail.trim()) {
      showMessage('Email is required', 'error');
      return;
    }

    try {
      // Simulate API call
      const newMember = {
        id: teamMembers.length + 1,
        username: formData.memberEmail.split('@')[0],
        email: formData.memberEmail,
        role: formData.memberRole,
        team_id: selectedTeam?.id || 1,
        joined_at: new Date().toISOString(),
      };

      setTeamMembers([...teamMembers, newMember]);
      setInviteMemberDialog(false);
      setFormData({ ...formData, memberEmail: '' });
      showMessage('Member invited successfully!');
    } catch (error) {
      console.error('Error inviting member:', error);
      showMessage('Error inviting member', 'error');
    }
  };

  const handleDeleteTeam = async (teamId, teamName) => {
    if (!window.confirm(`Are you sure you want to delete "${teamName}"?`)) {
      return;
    }

    try {
      setTeams(teams.filter(team => team.id !== teamId));
      showMessage('Team deleted successfully!');
    } catch (error) {
      console.error('Error deleting team:', error);
      showMessage('Error deleting team', 'error');
    }
  };

  const handleRemoveMember = async (memberId, memberName) => {
    if (!window.confirm(`Remove ${memberName} from the team?`)) {
      return;
    }

    try {
      setTeamMembers(teamMembers.filter(member => member.id !== memberId));
      showMessage('Member removed successfully!');
    } catch (error) {
      console.error('Error removing member:', error);
      showMessage('Error removing member', 'error');
    }
  };

  const handleMenuOpen = (event, member) => {
    setMenuAnchor(event.currentTarget);
    setSelectedMember(member);
  };

  const handleMenuClose = () => {
    setMenuAnchor(null);
    setSelectedMember(null);
  };

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  const filteredTeams = teams.filter(team =>
    team.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    team.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredMembers = teamMembers.filter(member =>
    member.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
    member.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 3, mb: 4 }}>
      {/* Breadcrumb */}
      <Breadcrumbs sx={{ mb: 3 }}>
        <Link 
          component="button" 
          variant="body1" 
          onClick={onBack}
          sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}
        >
          <Home fontSize="small" />
          Dashboard
        </Link>
        <Typography color="text.primary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Group fontSize="small" />
          Teams
        </Typography>
      </Breadcrumbs>

      {/* Header */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h5" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Group />
            Team Management
          </Typography>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => setCreateTeamDialog(true)}
          >
            Create Team
          </Button>
        </Box>

        {/* Tabs */}
        <Tabs value={tabValue} onChange={handleTabChange}>
          <Tab label={`Teams (${teams.length})`} icon={<GroupIcon/>} />
          <Tab label={`Members (${teamMembers.length})`} icon={<People />} />
        </Tabs>
      </Paper>

      {/* Search */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <TextField
          fullWidth
          placeholder={tabValue === 0 ? "Search teams..." : "Search members..."}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          InputProps={{
            startAdornment: <Search sx={{ mr: 1, color: 'text.secondary' }} />,
          }}
        />
      </Paper>

      {/* Teams Tab */}
      {tabValue === 0 && (
        <Grid container spacing={3}>
          {filteredTeams.length === 0 ? (
            <Grid item xs={12}>
              <Paper sx={{ p: 6, textAlign: 'center' }}>
                <Group sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
                <Typography variant="h6" color="textSecondary" gutterBottom>
                  No teams found
                </Typography>
                <Typography variant="body2" color="textSecondary" sx={{ mb: 3 }}>
                  {searchQuery ? 'No teams match your search criteria' : 'Create your first team to get started'}
                </Typography>
                {!searchQuery && (
                  <Button
                    variant="contained"
                    startIcon={<Add />}
                    onClick={() => setCreateTeamDialog(true)}
                  >
                    Create Team
                  </Button>
                )}
              </Paper>
            </Grid>
          ) : (
            filteredTeams.map((team) => (
              <Grid item xs={12} md={6} lg={4} key={team.id}>
                <Card>
                  <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                      <Box>
                        <Typography variant="h6" gutterBottom>
                          {team.name}
                        </Typography>
                        <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
                          {team.description || 'No description'}
                        </Typography>
                      </Box>
                      <IconButton size="small">
                        <MoreVert />
                      </IconButton>
                    </Box>

                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                      <AvatarGroup max={4} sx={{ mr: 2 }}>
                        {teamMembers
                          .filter(member => member.team_id === team.id)
                          .map((member) => (
                            <Avatar key={member.id} sx={{ width: 32, height: 32 }}>
                              {member.username[0].toUpperCase()}
                            </Avatar>
                          ))}
                      </AvatarGroup>
                      <Typography variant="body2" color="textSecondary">
                        {team.member_count} members
                      </Typography>
                    </Box>

                    <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
                      <Chip 
                        label={team.created_by === user?.id ? 'Owner' : 'Member'} 
                        size="small" 
                        color={team.created_by === user?.id ? 'primary' : 'default'}
                      />
                    </Stack>

                    <Stack direction="row" spacing={1}>
                      <Button
                        size="small"
                        startIcon={<PersonAdd />}
                        onClick={() => {
                          setSelectedTeam(team);
                          setInviteMemberDialog(true);
                        }}
                      >
                        Invite
                      </Button>
                      <Button
                        size="small"
                        startIcon={<Settings />}
                        onClick={() => {
                          setSelectedTeam(team);
                          setFormData({ ...formData, teamName: team.name, description: team.description });
                          setEditTeamDialog(true);
                        }}
                      >
                        Settings
                      </Button>
                    </Stack>
                  </CardContent>
                </Card>
              </Grid>
            ))
          )}
        </Grid>
      )}

      {/* Members Tab */}
      {tabValue === 1 && (
        <Paper sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Typography variant="h6">
              All Team Members ({filteredMembers.length})
            </Typography>
            <Button
              variant="outlined"
              startIcon={<PersonAdd />}
              onClick={() => setInviteMemberDialog(true)}
            >
              Invite Member
            </Button>
          </Box>

          {filteredMembers.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 6 }}>
              <People sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
              <Typography variant="h6" color="textSecondary" gutterBottom>
                No members found
              </Typography>
              <Typography variant="body2" color="textSecondary">
                {searchQuery ? 'No members match your search criteria' : 'No team members yet'}
              </Typography>
            </Box>
          ) : (
            <List>
              {filteredMembers.map((member, index) => (
                <React.Fragment key={member.id}>
                  <ListItem
                    secondaryAction={
                      <IconButton onClick={(e) => handleMenuOpen(e, member)}>
                        <MoreVert />
                      </IconButton>
                    }
                  >
                    <ListItemIcon>
                      <Avatar>
                        {member.username[0].toUpperCase()}
                      </Avatar>
                    </ListItemIcon>
                    <ListItemText 
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography variant="subtitle1">
                            {member.username}
                          </Typography>
                          <Chip 
                            label={member.role} 
                            size="small" 
                            color={member.role === 'admin' ? 'primary' : 'default'}
                            icon={member.role === 'admin' ? <SupervisorAccount /> : <Person />}
                          />
                        </Box>
                      }
                      secondary={
                        <Box sx={{ mt: 0.5 }}>
                          <Typography variant="body2" color="textSecondary">
                            {member.email}
                          </Typography>
                          <Typography variant="caption" color="textSecondary">
                            Joined: {new Date(member.joined_at).toLocaleDateString()}
                          </Typography>
                        </Box>
                      }
                    />
                  </ListItem>
                  {index < filteredMembers.length - 1 && <Divider />}
                </React.Fragment>
              ))}
            </List>
          )}
        </Paper>
      )}

      {/* Create Team Dialog */}
      <Dialog open={createTeamDialog} onClose={() => setCreateTeamDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Create New Team</DialogTitle>
        <DialogContent>
          <Stack spacing={3} sx={{ mt: 1 }}>
            <TextField
              fullWidth
              label="Team Name"
              value={formData.teamName}
              onChange={(e) => setFormData({ ...formData, teamName: e.target.value })}
              required
            />
            <TextField
              fullWidth
              label="Description"
              multiline
              rows={3}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateTeamDialog(false)}>Cancel</Button>
          <Button onClick={handleCreateTeam} variant="contained">Create Team</Button>
        </DialogActions>
      </Dialog>

      {/* Invite Member Dialog */}
      <Dialog open={inviteMemberDialog} onClose={() => setInviteMemberDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          Invite Team Member
          {selectedTeam && (
            <Typography variant="body2" color="textSecondary">
              to {selectedTeam.name}
            </Typography>
          )}
        </DialogTitle>
        <DialogContent>
          <Stack spacing={3} sx={{ mt: 1 }}>
            <TextField
              fullWidth
              label="Email Address"
              type="email"
              value={formData.memberEmail}
              onChange={(e) => setFormData({ ...formData, memberEmail: e.target.value })}
              required
            />
            <FormControl fullWidth>
              <InputLabel>Role</InputLabel>
              <Select
                value={formData.memberRole}
                label="Role"
                onChange={(e) => setFormData({ ...formData, memberRole: e.target.value })}
              >
                <MenuItem value="member">Member</MenuItem>
                <MenuItem value="admin">Admin</MenuItem>
              </Select>
            </FormControl>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setInviteMemberDialog(false)}>Cancel</Button>
          <Button onClick={handleInviteMember} variant="contained" startIcon={<Send />}>
            Send Invitation
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Team Dialog */}
      <Dialog open={editTeamDialog} onClose={() => setEditTeamDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Edit Team</DialogTitle>
        <DialogContent>
          <Stack spacing={3} sx={{ mt: 1 }}>
            <TextField
              fullWidth
              label="Team Name"
              value={formData.teamName}
              onChange={(e) => setFormData({ ...formData, teamName: e.target.value })}
              required
            />
            <TextField
              fullWidth
              label="Description"
              multiline
              rows={3}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
            <Box sx={{ pt: 2 }}>
              <Button
                color="error"
                startIcon={<Delete />}
                onClick={() => {
                  handleDeleteTeam(selectedTeam?.id, selectedTeam?.name);
                  setEditTeamDialog(false);
                }}
              >
                Delete Team
              </Button>
            </Box>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditTeamDialog(false)}>Cancel</Button>
          <Button variant="contained">Save Changes</Button>
        </DialogActions>
      </Dialog>

      {/* Member Menu */}
      <Menu
        anchorEl={menuAnchor}
        open={Boolean(menuAnchor)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={handleMenuClose}>
          <ListItemIcon>
            <Edit fontSize="small" />
          </ListItemIcon>
          Edit Role
        </MenuItem>
        <MenuItem onClick={handleMenuClose}>
          <ListItemIcon>
            <Email fontSize="small" />
          </ListItemIcon>
          Send Message
        </MenuItem>
        <Divider />
        <MenuItem 
          onClick={() => {
            handleRemoveMember(selectedMember?.id, selectedMember?.username);
            handleMenuClose();
          }}
          sx={{ color: 'error.main' }}
        >
          <ListItemIcon>
            <Delete fontSize="small" sx={{ color: 'error.main' }} />
          </ListItemIcon>
          Remove from Team
        </MenuItem>
      </Menu>

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert 
          onClose={() => setSnackbar({ ...snackbar, open: false })} 
          severity={snackbar.severity}
          variant="filled"
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default TeamsPage;
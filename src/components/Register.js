import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  TextField,
  Button,
  Typography,
  IconButton,
  InputAdornment,
  Link,
} from '@mui/material';
import {
  Visibility,
  VisibilityOff,
  DarkMode,
  LightMode,
} from '@mui/icons-material';
import { useTheme } from '../contexts/ThemeContext';

function Register({ onToggleForm }) {
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const { darkMode, toggleDarkMode } = useTheme();

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    // TODO: Implement register logic
    console.log('Register:', formData);
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        p: 2,
        background: (theme) =>
          theme.palette.mode === 'dark'
            ? 'linear-gradient(45deg, #1a237e 30%, #311b92 90%)'
            : 'linear-gradient(45deg, #bbdefb 30%, #e3f2fd 90%)',
      }}
    >
      <Card sx={{ maxWidth: 400, width: '100%' }}>
        <CardContent sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
            <Typography variant="h5" component="h1" fontWeight="500">
              Sign Up
            </Typography>
            <IconButton onClick={toggleDarkMode} size="small">
              {darkMode ? <LightMode /> : <DarkMode />}
            </IconButton>
          </Box>
          <form onSubmit={handleSubmit}>
            <TextField
              fullWidth
              label="Username"
              name="username"
              value={formData.username}
              onChange={handleChange}
              margin="normal"
              variant="outlined"
              required
            />
            <TextField
              fullWidth
              label="Email"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              margin="normal"
              variant="outlined"
              required
            />
            <TextField
              fullWidth
              label="Password"
              name="password"
              type={showPassword ? 'text' : 'password'}
              value={formData.password}
              onChange={handleChange}
              margin="normal"
              variant="outlined"
              required
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={() => setShowPassword(!showPassword)}
                      edge="end"
                    >
                      {showPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
            <TextField
              fullWidth
              label="Confirm Password"
              name="confirmPassword"
              type={showPassword ? 'text' : 'password'}
              value={formData.confirmPassword}
              onChange={handleChange}
              margin="normal"
              variant="outlined"
              required
            />
            <Button
              fullWidth
              type="submit"
              variant="contained"
              sx={{ mt: 3, mb: 2 }}
            >
              Sign Up
            </Button>
          </form>
          <Typography variant="body2" align="center">
            Already have an account?{' '}
            <Link
              component="button"
              variant="body2"
              onClick={onToggleForm}
              sx={{ textDecoration: 'none' }}
            >
              Sign In
            </Link>
          </Typography>
        </CardContent>
      </Card>
    </Box>
  );
}

export default Register;
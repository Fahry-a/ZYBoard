import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  Box,
  Card,
  CardContent,
  TextField,
  Button,
  Typography,
  Link,
  Alert,
  CircularProgress
} from '@mui/material';
import { useTheme } from '../contexts/ThemeContext';

const Register = () => {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        confirmPassword: ''
    });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { darkMode } = useTheme();

    const { name, email, password, confirmPassword } = formData;

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
        setError('');
    };
    
    const validateForm = () => {
        if (!name || !email || !password || !confirmPassword) {
            setError('All fields are required');
            return false;
        }

        if (password !== confirmPassword) {
            setError('Passwords do not match');
            return false;
        }

        if (password.length < 6) {
            setError('Password must be at least 6 characters long');
            return false;
        }

        // Basic email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            setError('Please enter a valid email address');
            return false;
        }

        return true;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            const response = await axios.post('http://localhost:5000/api/auth/register', {
                name,
                email,
                password
            });

            if (response.data.message === 'User registered successfully') {
                // Sukses, arahkan ke halaman login
                navigate('/login');
            }
        } catch (err) {
            setError(err.response?.data?.message || 'An error occurred during registration');
        } finally {
            setLoading(false);
        }
    };

    const handleLoginClick = () => {
        navigate('/login');
    };

    return (
        <Box
            sx={{
                minHeight: '100vh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                p: 2,
                background: darkMode
                    ? 'linear-gradient(45deg, #1a237e 30%, #311b92 90%)'
                    : 'linear-gradient(45deg, #bbdefb 30%, #e3f2fd 90%)'
            }}
        >
            <Card sx={{ maxWidth: 400, width: '100%' }}>
                <CardContent sx={{ p: 3 }}>
                    <Typography variant="h5" component="h1" gutterBottom>
                        Create Account
                    </Typography>

                    {error && (
                        <Alert severity="error" sx={{ mb: 2 }}>
                            {error}
                        </Alert>
                    )}

                    <form onSubmit={handleSubmit}>
                        <TextField
                            fullWidth
                            label="Full Name"
                            name="name"
                            value={name}
                            onChange={handleChange}
                            margin="normal"
                            required
                            disabled={loading}
                        />
                        <TextField
                            fullWidth
                            label="Email"
                            name="email"
                            type="email"
                            value={email}
                            onChange={handleChange}
                            margin="normal"
                            required
                            disabled={loading}
                        />
                        <TextField
                            fullWidth
                            label="Password"
                            name="password"
                            type="password"
                            value={password}
                            onChange={handleChange}
                            margin="normal"
                            required
                            disabled={loading}
                        />
                        <TextField
                            fullWidth
                            label="Confirm Password"
                            name="confirmPassword"
                            type="password"
                            value={confirmPassword}
                            onChange={handleChange}
                            margin="normal"
                            required
                            disabled={loading}
                        />

                        <Button
                            type="submit"
                            fullWidth
                            variant="contained"
                            sx={{ mt: 3, mb: 2 }}
                            disabled={loading}
                        >
                            {loading ? <CircularProgress size={24} /> : 'Register'}
                        </Button>
                    </form>

                    <Box sx={{ textAlign: 'center', mt: 2 }}>
                        <Typography variant="body2">
                            Already have an account?{' '}
                            <Link
                                component="button"
                                variant="body2"
                                onClick={handleLoginClick}
                                sx={{ textDecoration: 'none' }}
                            >
                                Sign In
                            </Link>
                        </Typography>
                    </Box>
                </CardContent>
            </Card>
        </Box>
    );
};

export default Register;
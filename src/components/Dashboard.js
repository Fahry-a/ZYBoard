import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3030';
const Dashboard = () => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const navigate = useNavigate();

    useEffect(() => {
        const checkAuth = async () => {
            try {
                const token = localStorage.getItem('token');
                if (!token) {
                    navigate('/login');
                    return;
                }

                const response = await axios.get(`${API_URL}/api/user/profile`, {
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                });

                setUser(response.data);
                setLoading(false);
            } catch (error) {
                console.error('Authentication error:', error);
                setError(error.message);
                localStorage.removeItem('token');
                navigate('/login');
            }
        };

        checkAuth();
    }, [navigate]);

    if (loading) {
        return (
            <div style={{ 
                display: 'flex', 
                justifyContent: 'center', 
                alignItems: 'center', 
                height: '100vh' 
            }}>
                Loading...
            </div>
        );
    }

    if (error) {
        return (
            <div style={{ 
                display: 'flex', 
                justifyContent: 'center', 
                alignItems: 'center', 
                height: '100vh',
                color: 'red' 
            }}>
                Error: {error}
            </div>
        );
    }

    const handleLogout = () => {
        localStorage.removeItem('token');
        navigate('/login');
    };

    if (loading) {
        return <div>Loading...</div>;
    }

    return (
        <div className="dashboard-container">
            <nav className="dashboard-nav">
                <h1>Dashboard</h1>
                <button onClick={handleLogout} className="logout-btn">
                    Logout
                </button>
            </nav>
            
            <div className="dashboard-content">
                <div className="user-info">
                    <h2>Welcome, {user?.name || 'User'}</h2>
                    <p>Email: {user?.email}</p>
                </div>
                
                <div className="dashboard-stats">
                    {/* Add your dashboard statistics or content here */}
                    <div className="stat-card">
                        <h3>Total Projects</h3>
                        <p>0</p>
                    </div>
                    <div className="stat-card">
                        <h3>Active Tasks</h3>
                        <p>0</p>
                    </div>
                    <div className="stat-card">
                        <h3>Completed Tasks</h3>
                        <p>0</p>
                    </div>
                </div>

                <div className="recent-activity">
                    <h3>Recent Activity</h3>
                    <div className="activity-list">
                        <p>No recent activity</p>
                    </div>
                </div>
            </div>

            <style jsx>{`
                .dashboard-container {
                    padding: 20px;
                    max-width: 1200px;
                    margin: 0 auto;
                }

                .dashboard-nav {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 30px;
                    padding: 10px 0;
                    border-bottom: 1px solid #eee;
                }

                .logout-btn {
                    padding: 8px 16px;
                    background-color: #dc3545;
                    color: white;
                    border: none;
                    border-radius: 4px;
                    cursor: pointer;
                }

                .logout-btn:hover {
                    background-color: #c82333;
                }

                .dashboard-content {
                    display: grid;
                    gap: 20px;
                }

                .user-info {
                    background: #f8f9fa;
                    padding: 20px;
                    border-radius: 8px;
                    margin-bottom: 20px;
                }

                .dashboard-stats {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
                    gap: 20px;
                    margin-bottom: 30px;
                }

                .stat-card {
                    background: white;
                    padding: 20px;
                    border-radius: 8px;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                }

                .recent-activity {
                    background: white;
                    padding: 20px;
                    border-radius: 8px;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                }

                .activity-list {
                    margin-top: 15px;
                }
            `}</style>
        </div>
    );
};

export default Dashboard;
import React, { useState, useEffect } from 'react';
import {
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Paper,
  Typography,
} from '@mui/material';
import {
  InsertDriveFile as FileIcon,
  Delete as DeleteIcon,
  Download as DownloadIcon,
} from '@mui/icons-material';

function FileList() {
  const [files, setFiles] = useState([]);

  useEffect(() => {
    fetchFiles();
  }, []);

  const fetchFiles = async () => {
    try {
      const response = await fetch('/api/files');
      const data = await response.json();
      setFiles(data);
    } catch (error) {
      console.error('Error fetching files:', error);
    }
  };

  const handleDelete = async (fileName) => {
    try {
      await fetch(`/api/files/${fileName}`, {
        method: 'DELETE',
      });
      fetchFiles();
    } catch (error) {
      console.error('Error deleting file:', error);
    }
  };

  return (
    <Paper sx={{ p: 2 }}>
      <Typography variant="h6" component="h2" gutterBottom>
        My Files
      </Typography>
      <List>
        {files.map((file, index) => (
          <ListItem key={index}>
            <ListItemIcon>
              <FileIcon />
            </ListItemIcon>
            <ListItemText
              primary={file.filename}
              secondary={`Size: ${file.size} bytes`}
            />
            <ListItemSecondaryAction>
              <IconButton
                edge="end"
                aria-label="download"
                onClick={() => window.open(`/api/files/${file.filename}`)}
              >
                <DownloadIcon />
              </IconButton>
              <IconButton
                edge="end"
                aria-label="delete"
                onClick={() => handleDelete(file.filename)}
              >
                <DeleteIcon />
              </IconButton>
            </ListItemSecondaryAction>
          </ListItem>
        ))}
      </List>
    </Paper>
  );
}

export default FileList;
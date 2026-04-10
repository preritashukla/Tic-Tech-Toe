import { ReactNode } from 'react';
import { AppBar, Toolbar, Typography, Box } from '@mui/material';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import { useNavigate } from 'react-router-dom';

interface LayoutProps {
  children: ReactNode;
  showTitle?: boolean;
}

const Layout = ({ children, showTitle = true }: LayoutProps) => {
  const navigate = useNavigate();

  return (
    <Box className="min-h-screen bg-background text-foreground flex flex-col">
      {showTitle && (
        <AppBar
          position="static"
          sx={{
            bgcolor: 'hsl(222, 47%, 9%)',
            borderBottom: '1px solid hsl(217, 33%, 20%)',
            boxShadow: 'none',
          }}
        >
          <Toolbar>
            <Box
              className="flex items-center gap-2 cursor-pointer"
              onClick={() => navigate('/')}
            >
              <AccountTreeIcon sx={{ color: 'hsl(217, 91%, 60%)' }} />
              <Typography
                variant="h6"
                sx={{ fontWeight: 700, color: 'hsl(213, 31%, 91%)', letterSpacing: '-0.02em' }}
              >
                AI Workflow Studio
              </Typography>
            </Box>
          </Toolbar>
        </AppBar>
      )}
      <Box className="flex-1 flex flex-col">{children}</Box>
    </Box>
  );
};

export default Layout;

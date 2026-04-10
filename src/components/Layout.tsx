import { ReactNode } from 'react';
import { AppBar, Toolbar, Typography, Box } from '@mui/material';
import BoltIcon from '@mui/icons-material/Bolt';
import { useNavigate } from 'react-router-dom';

interface LayoutProps {
  children: ReactNode;
  showTitle?: boolean;
}

const Layout = ({ children, showTitle = true }: LayoutProps) => {
  const navigate = useNavigate();

  return (
    <Box className="min-h-screen bg-background text-foreground flex flex-col relative overflow-hidden">
      {/* Background grid pattern */}
      <Box className="grid-bg" />

      <AppBar
        position="static"
        sx={{
          bgcolor: 'hsl(222, 47%, 6% / 0.8)',
          backdropFilter: 'blur(12px)',
          borderBottom: '1px solid hsl(217, 33%, 15%)',
          boxShadow: 'none',
          zIndex: 10,
        }}
      >
        <Toolbar>
          <Box
            className="flex items-center gap-2 cursor-pointer group"
            onClick={() => navigate('/')}
          >
            <BoltIcon
              sx={{
                color: 'hsl(217, 91%, 60%)',
                fontSize: 28,
                transition: 'all 0.3s',
                filter: 'drop-shadow(0 0 6px hsl(217, 91%, 60% / 0.5))',
              }}
              className="group-hover:scale-110 transition-transform duration-300"
            />
            <Typography
              variant="h6"
              sx={{
                fontWeight: 800,
                letterSpacing: '-0.02em',
                background: 'linear-gradient(90deg, hsl(213, 31%, 91%), hsl(217, 91%, 70%))',
                backgroundClip: 'text',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              Workflow Maestro ⚡
            </Typography>
          </Box>
        </Toolbar>
      </AppBar>

      <Box className="flex-1 flex flex-col relative z-10">{children}</Box>
    </Box>
  );
};

export default Layout;

import { useState } from 'react';
import { Box, TextField, Typography, CircularProgress, Chip } from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import RocketLaunchIcon from '@mui/icons-material/RocketLaunch';
import BugReportIcon from '@mui/icons-material/BugReport';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import DescriptionIcon from '@mui/icons-material/Description';
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive';

// MCP-relevant workflow examples matching the problem statement
const EXAMPLE_WORKFLOWS = [
  {
    text: 'When a critical bug is filed in Jira, create a GitHub branch, notify Slack on-call, and update the incident tracker',
    icon: <BugReportIcon sx={{ fontSize: '14px !important', color: 'hsl(0, 84%, 60%) !important' }} />,
  },
  {
    text: 'Monitor competitor prices, compare with GPT, alert on Discord, and log to Airtable',
    icon: <TrendingUpIcon sx={{ fontSize: '14px !important', color: 'hsl(142, 71%, 50%) !important' }} />,
  },
  {
    text: 'Parse PDF invoices, extract line items, update Google Sheets, and create Trello cards for review',
    icon: <DescriptionIcon sx={{ fontSize: '14px !important', color: 'hsl(217, 91%, 60%) !important' }} />,
  },
  {
    text: 'Monitor AWS CloudWatch alarms, create Jira tickets, notify Slack, and update status page',
    icon: <NotificationsActiveIcon sx={{ fontSize: '14px !important', color: 'hsl(38, 92%, 50%) !important' }} />,
  },
];

interface ChatInputProps {
  onSubmit: (text: string) => void;
  loading: boolean;
  error: string | null;
}

const ChatInput = ({ onSubmit, loading, error }: ChatInputProps) => {
  const [text, setText] = useState('');

  const handleSubmit = () => {
    if (!text.trim() || loading) return;
    onSubmit(text.trim());
  };

  return (
    <Box className="flex flex-col items-center justify-center min-h-[85vh] px-4 animate-fade-in">
      {/* Animated AI Icon */}
      <Box className="flex flex-col items-center gap-4 mb-10">
        <Box className="relative">
          <Box className="ai-icon-glow p-4 rounded-2xl bg-secondary relative z-10">
            <AutoAwesomeIcon sx={{ fontSize: 44, color: 'hsl(217, 91%, 60%)' }} className="ai-icon-spin" />
          </Box>
        </Box>
        <Typography
          variant="h3"
          sx={{
            fontWeight: 800,
            background: 'linear-gradient(135deg, hsl(213, 31%, 91%), hsl(217, 91%, 60%))',
            backgroundClip: 'text',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            letterSpacing: '-0.04em',
            textAlign: 'center',
            fontSize: { xs: '1.75rem', sm: '2.5rem', md: '3rem' },
          }}
        >
          Describe your workflow
        </Typography>
        <Typography sx={{ color: 'hsl(215, 20%, 55%)', textAlign: 'center', maxWidth: 520, fontSize: { xs: 14, sm: 16 }, lineHeight: 1.6, px: 1 }}>
          Enter a natural language description and our MCP Gateway will decompose it into an executable DAG across your connected services.
        </Typography>
      </Box>

      {/* Input Box with Glow */}
      <Box className="w-full max-w-2xl">
        <Box className={`input-glow-wrapper rounded-2xl p-[1px] transition-all duration-500 ${text.trim() ? 'input-glow-active' : ''}`}>
          <Box className="flex items-end gap-2 rounded-2xl bg-card p-3">
            <TextField
              fullWidth
              multiline
              maxRows={4}
              placeholder="e.g. When a critical bug is filed in Jira, create a GitHub branch, notify Slack…"
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit();
                }
              }}
              disabled={loading}
              variant="standard"
              slotProps={{
                input: {
                  disableUnderline: true,
                  sx: {
                    color: 'hsl(213, 31%, 91%)',
                    px: 2,
                    py: 1,
                    fontSize: 15,
                    fontFamily: "'Inter', system-ui, sans-serif",
                    '& ::placeholder': { color: 'hsl(215, 20%, 40%)' },
                  },
                },
              }}
            />
            <Box
              onClick={handleSubmit}
              className={`submit-btn flex items-center justify-center rounded-xl cursor-pointer transition-all duration-300 ${
                !text.trim() || loading ? 'submit-btn-disabled' : ''
              }`}
              sx={{
                minWidth: 52,
                height: 52,
                flexShrink: 0,
                pointerEvents: !text.trim() || loading ? 'none' : 'auto',
              }}
            >
              {loading ? (
                <CircularProgress size={22} sx={{ color: 'hsl(222, 47%, 6%)' }} />
              ) : (
                <RocketLaunchIcon sx={{ fontSize: 22, color: 'hsl(222, 47%, 6%)' }} />
              )}
            </Box>
          </Box>
        </Box>

        {/* Loading State */}
        {loading && (
          <Box className="flex items-center justify-center gap-3 mt-5 animate-fade-in">
            <Box className="loading-dots flex gap-1">
              <span className="dot" />
              <span className="dot" />
              <span className="dot" />
            </Box>
            <Typography sx={{ color: 'hsl(217, 91%, 60%)', fontSize: 14, fontWeight: 500 }}>
              Decomposing workflow into DAG…
            </Typography>
          </Box>
        )}

        {error && (
          <Box
            className="flex items-center gap-2 justify-center mt-3 px-4 py-2 rounded-lg"
            sx={{ bgcolor: 'hsl(0, 84%, 60% / 0.08)', border: '1px solid hsl(0, 84%, 60% / 0.2)' }}
          >
            <Typography sx={{ color: 'hsl(0, 84%, 65%)', fontSize: 13 }}>
              {error}
            </Typography>
          </Box>
        )}

        {/* Example Workflow Chips */}
        {!loading && (
          <Box className="flex flex-wrap justify-center gap-2 mt-6 animate-fade-in" sx={{ animationDelay: '0.2s' }}>
            {EXAMPLE_WORKFLOWS.map((example) => (
              <Chip
                key={example.text}
                label={example.text}
                onClick={() => setText(example.text)}
                icon={example.icon}
                sx={{
                  bgcolor: 'hsl(217, 33%, 12%)',
                  color: 'hsl(215, 20%, 65%)',
                  border: '1px solid hsl(217, 33%, 18%)',
                  borderRadius: '12px',
                  fontSize: 11,
                  height: 'auto',
                  py: 0.75,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  maxWidth: { xs: '100%', sm: '48%' },
                  '& .MuiChip-label': {
                    whiteSpace: 'normal',
                    lineHeight: 1.4,
                  },
                  '&:hover': {
                    bgcolor: 'hsl(217, 33%, 17%)',
                    color: 'hsl(213, 31%, 91%)',
                    borderColor: 'hsl(217, 91%, 60% / 0.4)',
                    transform: 'translateY(-1px)',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
                  },
                }}
              />
            ))}
          </Box>
        )}
      </Box>

      {/* Bottom tag */}
      <Typography sx={{ color: 'hsl(215, 20%, 30%)', fontSize: 11, mt: 6, textAlign: 'center' }}>
        Powered by Model Context Protocol (MCP) · Supports Jira, GitHub, Slack, Sheets, Discord, AWS & more
      </Typography>
    </Box>
  );
};

export default ChatInput;

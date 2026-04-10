import { useState } from 'react';
import { Box, TextField, Typography, CircularProgress, Chip } from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import RocketLaunchIcon from '@mui/icons-material/RocketLaunch';

const EXAMPLE_WORKFLOWS = [
  'Scrape top HN posts, summarize with GPT, post to Slack',
  'Monitor competitor prices, compare, alert on changes',
  'Parse PDF invoices, extract data, update spreadsheet',
  'Fetch weather API, generate report, email team',
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
          }}
        >
          Describe your workflow
        </Typography>
        <Typography sx={{ color: 'hsl(215, 20%, 55%)', textAlign: 'center', maxWidth: 500, fontSize: 16, lineHeight: 1.6 }}>
          Enter a natural language description and we'll orchestrate an AI-powered execution plan in seconds.
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
              placeholder="e.g. Scrape website, summarize with GPT, email results..."
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
              Generating execution plan…
            </Typography>
          </Box>
        )}

        {error && (
          <Typography sx={{ color: 'hsl(0, 84%, 60%)', mt: 2, textAlign: 'center', fontSize: 14 }}>
            {error}
          </Typography>
        )}

        {/* Example Workflow Chips */}
        {!loading && (
          <Box className="flex flex-wrap justify-center gap-2 mt-6 animate-fade-in" sx={{ animationDelay: '0.2s' }}>
            {EXAMPLE_WORKFLOWS.map((example) => (
              <Chip
                key={example}
                label={example}
                onClick={() => setText(example)}
                icon={<SendIcon sx={{ fontSize: '14px !important', color: 'hsl(215, 20%, 50%) !important' }} />}
                sx={{
                  bgcolor: 'hsl(217, 33%, 12%)',
                  color: 'hsl(215, 20%, 65%)',
                  border: '1px solid hsl(217, 33%, 20%)',
                  borderRadius: '12px',
                  fontSize: 12,
                  height: 34,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  '&:hover': {
                    bgcolor: 'hsl(217, 33%, 17%)',
                    color: 'hsl(213, 31%, 91%)',
                    borderColor: 'hsl(217, 91%, 60% / 0.4)',
                    transform: 'translateY(-1px)',
                  },
                }}
              />
            ))}
          </Box>
        )}
      </Box>
    </Box>
  );
};

export default ChatInput;

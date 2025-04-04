import { Box, LinearProgress, styled, Typography, useTheme } from '@mui/material'
import type { WorkerProgress } from '@nexp/front-lib/platform'
import React from 'react'

const FCBackground = styled(Box)`
  display: flex;
  justify-content: center;
  align-items: center;
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: -1;
`

const FCProgressContainer = styled(Box)`
  display: flex;
  justify-content: center;
  position: absolute;
  left: 5%;
  right: 5%;
  bottom: 1rem;
  flex-direction: column;
`

export const CodeLoadingSplash: React.FC<{ progress: WorkerProgress }> = props => {
  const { progress } = props
  const { palette } = useTheme()
  return (
    <Box height={1} position='relative' width={1}>
      <FCBackground>
        <Typography variant='h4'>加载编码环境</Typography>
      </FCBackground>
      <FCProgressContainer>
        <LinearProgress
          color={progress.error ? 'error' : 'info'}
          value={progress.progress * 100}
          variant='determinate'
        />
        <Typography style={{ color: progress.error ? palette.md3.error : palette.md3.outline }} variant='subtitle2'>
          {progress.error ? progress.error : progress.message}
        </Typography>
      </FCProgressContainer>
    </Box>
  )
}

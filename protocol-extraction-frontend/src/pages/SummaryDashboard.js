import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Box, Paper, Typography, LinearProgress, Divider, Button, Grid, Chip } from '@mui/material';
import { Bar, Pie } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, ArcElement, Tooltip, Legend } from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Tooltip, Legend);

// Utility to safely count filled fields in an object recursively
const countFilledFields = (obj) => {
  let filled = 0;
  let total = 0;
  if (typeof obj !== 'object' || obj === null) return { filled: 0, total: 0 };

  Object.entries(obj).forEach(([key, val]) => {
    if (val === null || val === undefined || val === '') {
      total++;
    } else if (typeof val === 'object') {
      const nested = countFilledFields(val);
      filled += nested.filled;
      total += nested.total;
    } else {
      total++;
      if (val !== '' && val !== false) {
        filled++;
      }
    }
  });
  return { filled, total };
};

export default function SummaryDashboard() {
  const location = useLocation();
  const navigate = useNavigate();

  // Provide safe defaults if location.state or its properties are missing
  const {
    dashboardData = {},
    rtsmData = {},
    rolesData = {},
    inventoryData = {},
    drugOrderingData = {},
  } = location.state || {};

  // Calculate completion and complexity scores per section
  const dashboardCompletion = countFilledFields(dashboardData);
  const rtsmCompletion = countFilledFields(rtsmData);
  const rolesCompletion = countFilledFields(rolesData);
  const inventoryCompletion = countFilledFields(inventoryData);
  const drugOrderingCompletion = countFilledFields(drugOrderingData);

  // Aggregate for overall completion and complexity
  const totalFilled =
    dashboardCompletion.filled +
    rtsmCompletion.filled +
    rolesCompletion.filled +
    inventoryCompletion.filled +
    drugOrderingCompletion.filled;
  const totalFields =
    dashboardCompletion.total +
    rtsmCompletion.total +
    rolesCompletion.total +
    inventoryCompletion.total +
    drugOrderingCompletion.total;
  const overallPercent = totalFields > 0 ? (totalFilled / totalFields) * 100 : 0;

  // Prepare data for charts
  const sectionLabels = ['Dashboard', 'RTSM Info', 'Roles & Access', 'Inventory Defaults', 'Drug Ordering'];
  const sectionCompletionPercents = [
    dashboardCompletion.total ? (dashboardCompletion.filled / dashboardCompletion.total) * 100 : 0,
    rtsmCompletion.total ? (rtsmCompletion.filled / rtsmCompletion.total) * 100 : 0,
    rolesCompletion.total ? (rolesCompletion.filled / rolesCompletion.total) * 100 : 0,
    inventoryCompletion.total ? (inventoryCompletion.filled / inventoryCompletion.total) * 100 : 0,
    drugOrderingCompletion.total ? (drugOrderingCompletion.filled / drugOrderingCompletion.total) * 100 : 0,
  ];

  const barData = {
    labels: sectionLabels,
    datasets: [
      {
        label: '% Completed',
        data: sectionCompletionPercents,
        backgroundColor: ['#2196f3', '#4caf50', '#ff9800', '#9c27b0', '#f44336'],
      },
    ],
  };

  const pieData = {
    labels: ['Completed', 'Remaining'],
    datasets: [
      {
        label: 'Overall Completion',
        data: [overallPercent, 100 - overallPercent],
        backgroundColor: ['#4caf50', '#e0e0e0'],
        hoverOffset: 10,
      },
    ],
  };

  // Define complexity level
  const complexityLevel =
    overallPercent > 85 ? 'High' : overallPercent > 60 ? 'Medium' : overallPercent > 30 ? 'Low' : 'Very Low';

  const complexityColor =
    overallPercent > 85 ? 'success' : overallPercent > 60 ? 'warning' : overallPercent > 30 ? 'info' : 'error';

  return (
    <Box sx={{ p: 4, maxWidth: 1100, mx: 'auto' }}>
      <Typography variant="h4" gutterBottom align="center">
        Project Summary Dashboard
      </Typography>

      <Divider sx={{ mb: 3 }} />

      <Paper sx={{ p: 3, mb: 4 }}>
        <Typography variant="h6" gutterBottom>
          Overall Completion
        </Typography>
        <Box sx={{ width: '100%', mb: 2 }}>
          <LinearProgress variant="determinate" value={overallPercent} sx={{ height: 20, borderRadius: 1 }} />
          <Typography variant="body1" align="center" sx={{ mt: 1 }}>
            {overallPercent.toFixed(1)}%
          </Typography>
        </Box>
        <Box textAlign="center" my={1}>
          <Chip label={`Complexity Level: ${complexityLevel}`} color={complexityColor} />
        </Box>
      </Paper>

      <Grid container spacing={4}>
        <Grid item xs={12} md={7}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Section Completion Breakdown
            </Typography>
            <Bar data={barData} options={{ responsive: true, plugins: { legend: { display: false } } }} />
          </Paper>
        </Grid>
        <Grid item xs={12} md={5}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Overall Completion Ratio
            </Typography>
            <Pie data={pieData} options={{ responsive: true, plugins: { legend: { position: 'bottom' } } }} />
          </Paper>
        </Grid>
      </Grid>

      <Divider sx={{ my: 4 }} />

      {/* Insights Section */}
      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>
          Key Insights
        </Typography>
        <Typography variant="body1" mb={1}>
          Roles Defined:{' '}
          {rolesData
            ? rolesData.systemRoles?.length ?? rolesData.length ?? 'N/A'
            : 'N/A'}
        </Typography>
        <Typography variant="body1" mb={1}>
          Inventory Default Entries:{' '}
          {inventoryData
            ? inventoryData.studyRows?.length ?? 'N/A'
            : 'N/A'}
        </Typography>
        <Typography variant="body1" mb={1}>
          Predictive Rules Count:{' '}
          {drugOrderingData
            ? drugOrderingData.predictiveRules?.length ?? 'N/A'
            : 'N/A'}
        </Typography>
        <Typography variant="body1" mb={1}>
          RTSM Info Fields Filled: {rtsmCompletion.filled} of {rtsmCompletion.total}
        </Typography>

        {/* Add more insights as needed */}
      </Paper>

      <Box mt={4} textAlign="center">
        <Button variant="contained" onClick={() => navigate('/drug-ordering-resupply')}>
          Back to Drug Ordering & Automated Resupply
        </Button>
      </Box>
    </Box>
  );
}

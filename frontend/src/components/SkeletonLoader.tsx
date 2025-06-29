import { Card, CardContent, Skeleton, Grid } from '@mui/material';

export default function SkeletonLoader() {
  return (
    <Grid container spacing={3}>
      {[1, 2, 3].map((index) => (
        <Grid item xs={12} sm={6} md={4} key={index}>
          <Card 
            className="animate-fadeIn"
            sx={{ 
              animationDelay: `${index * 0.1}s`,
              animationFillMode: 'both'
            }}
          >
            <CardContent>
              <Skeleton 
                variant="text" 
                width="60%" 
                height={32}
                animation="wave"
                sx={{ mb: 1 }}
              />
              <Skeleton 
                variant="text" 
                width="100%" 
                height={20}
                animation="wave"
                sx={{ mb: 0.5 }}
              />
              <Skeleton 
                variant="text" 
                width="80%" 
                height={20}
                animation="wave"
                sx={{ mb: 2 }}
              />
              <Skeleton 
                variant="rectangular" 
                height={40}
                animation="wave"
              />
            </CardContent>
          </Card>
        </Grid>
      ))}
    </Grid>
  );
}
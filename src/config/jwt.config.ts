export const jwtConfig = {
  secret: process.env.JWT_SECRET || 'your-secret-key-here',
  refreshTokenExpiresIn: '30d',
};

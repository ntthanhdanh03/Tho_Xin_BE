FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package.json yarn.lock ./

# Install dependencies với yarn
RUN yarn install --frozen-lockfile

# Copy source code
COPY . .

# Build app
RUN yarn build

# Expose port
EXPOSE 3000

# Start app
CMD ["yarn", "start:prod"]
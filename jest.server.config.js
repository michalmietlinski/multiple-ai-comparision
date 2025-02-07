export default {
  testEnvironment: "node",
  transform: {
    "^.+\\.jsx?$": "babel-jest"
  },
  moduleFileExtensions: ["js", "json"],
  testMatch: ["**/tests/**/*.test.js"],
  collectCoverageFrom: [
    "src/server/**/*.js",
    "!src/server/tests/**"
  ]
}; 

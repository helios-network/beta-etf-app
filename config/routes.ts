export const routes = {
  home: "/",
  etfList: "/etf-list",
  etfCreate: "/etf-creator",
  etfMint: "/etf-mint",
  etfWithdraw: "/etf-withdraw",
  etfDetails: (address: string) => `/etf-details/${address}`,
  etfPredictions: "/etf-prediction",
  etfPrediction: (token: string) => `/etf-prediction/${token}`,
  leaderboard: "/leaderboard",
  portfolio: "/portfolio"
}

export default routes

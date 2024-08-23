from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from scipy.stats import norm
import math
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins, adjust this in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Define the request body model
class BlackScholesRequest(BaseModel):
    S: float  # Stock price
    K: float  # Strike price
    T: float  # Time to maturity (in years)
    r: float  # Risk-free interest rate
    sigma: float  # Volatility

# Define the request body model
class HeatmapRequest(BaseModel):
    K: float  # Strike price
    T: float  # Time to maturity (in years)
    r: float  # Risk-free interest rate
    min_spot_price: float  # Minimum spot price
    max_spot_price: float  # Maximum spot price
    min_volatility: float  # Minimum volatility
    max_volatility: float  # Maximum volatility
    spot_steps: int  # Number of steps for spot prices
    volatility_steps: int  # Number of steps for volatilities

# Black-Scholes calculation function
def black_scholes(S, K, T, r, sigma):
    d1 = (math.log(S / K) + (r + 0.5 * sigma ** 2) * T) / (sigma * math.sqrt(T))
    d2 = d1 - sigma * math.sqrt(T)
    call_price = S * norm.cdf(d1) - K * math.exp(-r * T) * norm.cdf(d2)
    put_price = K * math.exp(-r * T) * norm.cdf(-d2) - S * norm.cdf(-d1)
    return call_price, put_price

# Define the API endpoint
@app.post("/calculate")
def calculate_option_prices(request: BlackScholesRequest):
    try:
        call_price, put_price = black_scholes(
            S=request.S,
            K=request.K,
            T=request.T,
            r=request.r,
            sigma=request.sigma
        )
        return {"call_price": call_price, "put_price": put_price}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

# Define the API endpoint for Heatmap
@app.post("/heatmap")
def calculate_heatmap(request: HeatmapRequest):
    try:
        # Generate spot price and volatility ranges
        S_range = [request.min_spot_price + i * (request.max_spot_price - request.min_spot_price) / (request.spot_steps - 1) for i in range(request.spot_steps)]
        sigma_range = [request.min_volatility + i * (request.max_volatility - request.min_volatility) / (request.volatility_steps - 1) for i in range(request.volatility_steps)]

        call_prices = []
        put_prices = []

        for S in S_range:
            call_row = []
            put_row = []
            for sigma in sigma_range:
                call_price, put_price = black_scholes(S, request.K, request.T, request.r, sigma)
                call_row.append(call_price)
                put_row.append(put_price)
            call_prices.append(call_row)
            put_prices.append(put_row)

        return {"call_prices": call_prices, "put_prices": put_prices, "spot_prices": S_range, "volatilities": sigma_range}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
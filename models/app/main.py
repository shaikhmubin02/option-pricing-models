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

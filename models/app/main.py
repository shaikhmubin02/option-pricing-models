from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns
from scipy.stats import norm
import math
from io import BytesIO
from pydantic import BaseModel
from mangum import Mangum

app = FastAPI()

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins, adjust this in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class OptionPricingRequest(BaseModel):
    S: float
    K: float
    T: float
    r: float
    sigma: float

# Black-Scholes calculation function
def black_scholes(S, K, T, r, sigma):
    d1 = (math.log(S / K) + (r + 0.5 * sigma ** 2) * T) / (sigma * math.sqrt(T))
    d2 = d1 - sigma * math.sqrt(T)
    call_price = S * norm.cdf(d1) - K * math.exp(-r * T) * norm.cdf(d2)
    put_price = K * math.exp(-r * T) * norm.cdf(-d2) - S * norm.cdf(-d1)
    return call_price, put_price, d1, d2

@app.post("/calculate")
async def calculate_option_prices(request: OptionPricingRequest):
    try:
        S = request.S
        K = request.K
        T = request.T
        r = request.r
        sigma = request.sigma
        
        call_price, put_price, d1, d2 = black_scholes(S, K, T, r, sigma)
        
        return {
            "call_price": call_price,
            "put_price": put_price,
            "d1": d1,
            "d2": d2
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    
def calculate_heatmap(min_spot_price, max_spot_price, min_volatility, max_volatility, spot_steps, volatility_steps, K, T, r, option_type: str):
    spot_range = np.linspace(min_spot_price, max_spot_price, spot_steps)
    vol_range = np.linspace(min_volatility, max_volatility, volatility_steps)
    
    prices = np.zeros((len(vol_range), len(spot_range)))
    
    for i, sigma in enumerate(vol_range):
        for j, S in enumerate(spot_range):
            call_price, put_price, d1, d2 = black_scholes(S, K, T, r, sigma)
            prices[i, j] = call_price if option_type == "call" else put_price
    
    fig, ax = plt.subplots(figsize=(10, 8))
    sns.heatmap(prices, xticklabels=np.round(spot_range, 2), yticklabels=np.round(vol_range, 2), annot=True, fmt=".2f", cmap="viridis", ax=ax)
    ax.set_title(option_type.upper())
    ax.set_xlabel('Spot Price')
    ax.set_ylabel('Volatility')
    
    buf = BytesIO()
    plt.savefig(buf, format='png')
    buf.seek(0)
    plt.close(fig)
    
    return StreamingResponse(buf, media_type="image/png")

@app.get("/heatmaps/call")
async def heatmap_call(
    min_spot_price: float,
    max_spot_price: float,
    min_volatility: float,
    max_volatility: float,
    spot_steps: int,
    volatility_steps: int,
    K: float,
    T: float,
    r: float
):
    return calculate_heatmap(min_spot_price, max_spot_price, min_volatility, max_volatility, spot_steps, volatility_steps, K, T, r, option_type="call")

@app.get("/heatmaps/put")
async def heatmap_put(
    min_spot_price: float,
    max_spot_price: float,
    min_volatility: float,
    max_volatility: float,
    spot_steps: int,
    volatility_steps: int,
    K: float,
    T: float,
    r: float
):
    return calculate_heatmap(min_spot_price, max_spot_price, min_volatility, max_volatility, spot_steps, volatility_steps, K, T, r, option_type="put")

# Add this at the end of the file
handler = Mangum(app)

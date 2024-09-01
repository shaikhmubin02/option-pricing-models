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
from typing import List

app = FastAPI()
@app.get("/")
async def root():
    return {"message": "Hello, World!"}


# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
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


class OptionParams(BaseModel):
    stock_price: float
    strike_price: float
    risk_free_rate: float
    volatility: float
    time_to_expiration: float
    steps: int
    is_american: bool

class OptionPrices(BaseModel):
    call_price: float
    put_price: float
    call_tree: List[List[float]]
    put_tree: List[List[float]]
    greeks: dict

@app.post("/calculate_option_prices", response_model=OptionPrices)
def calculate_option_prices(params: OptionParams):
    S = params.stock_price
    K = params.strike_price
    r = params.risk_free_rate
    sigma = params.volatility
    T = params.time_to_expiration
    N = params.steps
    is_american = params.is_american

    dt = T / N
    u = np.exp(sigma * np.sqrt(dt))
    d = 1 / u
    p = (np.exp(r * dt) - d) / (u - d)

    call_tree = np.zeros((N + 1, N + 1))
    put_tree = np.zeros((N + 1, N + 1))

    for j in range(N + 1):
        call_tree[N, j] = max(0, S * (u ** j) * (d ** (N - j)) - K)
        put_tree[N, j] = max(0, K - S * (u ** j) * (d ** (N - j)))

    for i in range(N - 1, -1, -1):
        for j in range(i + 1):
            call_value = np.exp(-r * dt) * (p * call_tree[i + 1, j + 1] + (1 - p) * call_tree[i + 1, j])
            put_value = np.exp(-r * dt) * (p * put_tree[i + 1, j + 1] + (1 - p) * put_tree[i + 1, j])

            if is_american:
                stock_price = S * (u ** j) * (d ** (i - j))
                call_tree[i, j] = max(call_value, stock_price - K)
                put_tree[i, j] = max(put_value, K - stock_price)
            else:
                call_tree[i, j] = call_value
                put_tree[i, j] = put_value

    call_price = call_tree[0, 0]
    put_price = put_tree[0, 0]

    # Calculate Greeks
    delta = (call_tree[1, 1] - call_tree[1, 0]) / (S * u - S * d)
    gamma = ((call_tree[2, 2] - call_tree[2, 1]) / (S * u * u - S) -
             (call_tree[2, 1] - call_tree[2, 0]) / (S - S * d * d)) / (0.5 * (S * u * u - S * d * d))
    theta = (call_tree[1, 1] - call_tree[0, 0]) / (2 * dt)

    # Vega calculation (approximation)
    def calculate_price_with_vol(vol):
        u_new = np.exp(vol * np.sqrt(dt))
        d_new = 1 / u_new
        p_new = (np.exp(r * dt) - d_new) / (u_new - d_new)
        call_tree_new = np.zeros((N + 1, N + 1))
        for j in range(N + 1):
            call_tree_new[N, j] = max(0, S * (u_new ** j) * (d_new ** (N - j)) - K)
        for i in range(N - 1, -1, -1):
            for j in range(i + 1):
                call_tree_new[i, j] = np.exp(-r * dt) * (p_new * call_tree_new[i + 1, j + 1] + (1 - p_new) * call_tree_new[i + 1, j])
        return call_tree_new[0, 0]

    vega = (calculate_price_with_vol(sigma + 0.01) - call_price) / 0.01

    greeks = {
        "delta": delta,
        "gamma": gamma,
        "theta": theta,
        "vega": vega
    }

    return OptionPrices(
        call_price=call_price,
        put_price=put_price,
        call_tree=call_tree.tolist(),
        put_tree=put_tree.tolist(),
        greeks=greeks
    )

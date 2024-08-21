from flask import Flask, request, jsonify
from numpy import exp, sqrt, log
from scipy.stats import norm

app = Flask(__name__)

class BlackScholes:
    def __init__(self, time_to_maturity, strike, current_price, volatility, interest_rate):
        self.time_to_maturity = time_to_maturity
        self.strike = strike
        self.current_price = current_price
        self.volatility = volatility
        self.interest_rate = interest_rate

    def calculate_prices(self):
        d1 = (
            log(self.current_price / self.strike) +
            (self.interest_rate + 0.5 * self.volatility ** 2) * self.time_to_maturity
        ) / (self.volatility * sqrt(self.time_to_maturity))
        d2 = d1 - self.volatility * sqrt(self.time_to_maturity)

        call_price = self.current_price * norm.cdf(d1) - (
            self.strike * exp(-self.interest_rate * self.time_to_maturity) * norm.cdf(d2)
        )
        put_price = (
            self.strike * exp(-self.interest_rate * self.time_to_maturity) * norm.cdf(-d2)
        ) - self.current_price * norm.cdf(-d1)

        return {
            'call_price': call_price,
            'put_price': put_price
        }

@app.route('/calculate', methods=['POST'])
def calculate():
    data = request.json
    bs = BlackScholes(
        time_to_maturity=data['time_to_maturity'],
        strike=data['strike'],
        current_price=data['current_price'],
        volatility=data['volatility'],
        interest_rate=data['interest_rate']
    )
    prices = bs.calculate_prices()
    return jsonify(prices)

if __name__ == '__main__':
    app.run(debug=True)

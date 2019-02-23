
//buy when short crossed long from the bottom
//sell at predetermined stop loss or take profit

// Let's create our own strategy
var strat = {};

// Prepare everything our strat needs
strat.init = function() {
  // your code!
  
  
  var settings = {
    short: this.settings.short.short,
    long: this.settings.long.long,
    signal: this.settings.signal.signal
  };
	
	
  // add the indicator to the strategy
  this.addIndicator('mymacd', 'MACD', settings);
  
  this.currentSlow;
  this.currentFast;
  this.buyPrice;
  this.stopLoss = this.settings.stop_loss.stop_loss;
  this.takeProfit = this.settings.take_profit.take_profit;
  this.inTrade = false;
	
  
  this.TimeToSell = function(candle)
	{
		if((candle.close / this.buyPrice) - 1 >= this.takeProfit/100)
			return true;
		else if (1-(candle.close/ this.buyPrice) >= this.stopLoss/100)
			return true;
	}
  
  
}

// What happens on every new candle?
strat.update = function(candle) {
  // your code!
  macdresult = this.indicators.mymacd;
  this.currentSlow = macdresult.long.result;
  this.currentFast = macdresult.short.result;
}

// For debugging purposes.
strat.log = function() {
  // your code!
}

// Based on the newly calculated
// information, check if we should
// update or not.
strat.check = function(candle) {
  // your code!
  if(this.currentFast >= this.currentSlow && !this.inTrade)
  {
	  this.advice('long');
	  this.inTrade = true;
	  this.buyPrice = candle.close;
  }
  else if (this.inTrade && this.TimeToSell(candle) )
  {
	  this.advice('short');
	  this.inTrade = false;
	  
  }
}

// Optional for executing code
// after completion of a backtest.
// This block will not execute in
// live use as a live gekko is
// never ending.
strat.end = function() {
  // your code!
}

module.exports = strat;
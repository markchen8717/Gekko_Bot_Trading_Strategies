// Let's create our own strategy
//Buy the dip determined by both the RSI and a Hammer candle stick, and sell within an exposure time in 1 min chart

var log = require('../core/log');
var config = require ('../core/util.js').getConfig();

const CandleBatcher = require('../core/candleBatcher');
const RSI = require('../strategies/indicators/RSI.js');



//Settings input
var stop_loss;
var take_profit;
var exposure_time;
var rsi_length;
var rsi_low;
var rsi_high;
var time_frame;

//Candle variables
var candle_counter = 0;
var candle_custom;

//Strat variables
var candle_batcher;
var rsi_batcher;
var adviced = false;
var buy_price;
var exposure_count = 0;

//RSI INDICATOR
var rsi_result = null;
var real_rsi;

var strat = {};


// Prepare everything our strat needs
strat.init = function() {	
  this.requiredHistory = config.tradingAdvisor.historySize;

  // since we're relying on batching 1 minute candles into 5 minute candles
  // lets throw if the settings are wrong
  if (config.tradingAdvisor.candleSize !== 1) {
    throw "This strategy must run with candleSize=1";
  }
	
  //Settings input initialization
  stop_loss=-this.settings.stop_loss.stop_loss;
  take_profit=this.settings.take_profit.take_profit;
  exposure_time=this.settings.exposure_time.exposure_time;
  rsi_length= this.settings.rsi.rsi_length;
  rsi_low= this.settings.rsi_low.rsi_low;
  rsi_high=this.settings.rsi_high.rsi_high;
  time_frame = this.settings.time_frame.time_frame;
  
  /*
  console.log(stop_loss);
  console.log(take_profit);
  console.log(exposure_time);
  console.log(rsi_length);
  console.log(rsi_low);
  console.log(rsi_high);
  console.log(time_frame);
  */
 
  
  //Strat variables initialization
  candle_batcher = new CandleBatcher(time_frame);
  rsi_batcher = new CandleBatcher(time_frame);
  candle_batcher.on('candle', this.update_candle); //Candle Batcher callback
  rsi_batcher.on('candle',this.update_rsi); //RSI Batcher callback
 
  
   //RSI INDICATOR
  real_rsi = new RSI({ interval: rsi_length }); //Real RSI
  this.addIndicator('dummyrsi', 'RSI', { interval: rsi_length}); //Dummy RSI
  
 
}

strat.isHammer = function ()
{
	
	if(candle_custom.close <candle_custom.open && (candle_custom.close - candle_custom.low) > (candle_custom.open - candle_custom.close) && (candle_custom.high == candle_custom.open))
		return true;
	else
		return false;
}

strat.buy_now = function (candle)
{
	
	if(!adviced && rsi_result <= rsi_low && this.isHammer() )
		return true;
	else
		return false;
}


strat.sell_now = function(candle)
{
	var percent_increase = (candle.close - buy_price) / buy_price * 100;
	//console.log(percent_increase);
	if(adviced && ((percent_increase >= take_profit || percent_increase <= stop_loss) || exposure_count >= exposure_time))
		return true;
	else
		return false;
}

strat.update_rsi = function(candle)
{
	//console.log("callback");
	real_rsi.update(candle);
	rsi_result = real_rsi.result;
	
	//console.log("=========");
	//console.log(rsi_result);
	
}

strat.update_candle = function (candle)
{
	//console.log("callback");
	candle_custom = candle_batcher.calculatedCandles[0];
	//console.log(this.candle_custom);
}


// What happens on every new candle?
strat.update = function(candle) {
	
	

	
	candle_batcher.write([candle]);
	rsi_batcher.write([candle]);
	
	//console.log(this.candle_batcher);
	
	candle_batcher.flush();
	rsi_batcher.flush();
	
	
	//console.log("============");
	//console.log(this.candle_batcher);
	//console.log(rsi_result);

	
	if(adviced)
	{
		exposure_count++;
	}
	
	candle_counter++;
	if(candle_counter == time_frame+1)
		candle_counter = 1;
	
	/*
	if(candle_counter==time_frame)
	{console.log("========");
	console.log(candle_custom.start.format());
	console.log("rsi result " + rsi_result);
	console.log("open "+candle_custom.open);
	console.log("close "+candle_custom.close);
	console.log("max "+candle_custom.high);
	console.log("min "+candle_custom.low);
	console.log(this.isHammer());
	}
	
	*/
}

// Based on the newly calculated
// information, check if we should
// update or not.
strat.check = function(candle) {
	
	if(strat.buy_now(candle) && candle_counter == time_frame)
	{
		this.advice('long');
		adviced = true;
		buy_price = candle.close;
		
		console.log("========");
	console.log(candle_custom);
	console.log("rsi result " + rsi_result);
	console.log("buy price " + buy_price);
		
		
	}
	if(strat.sell_now(candle))
	{
		this.advice('short');
		adviced = false;
		exposure_count = 0;
		
	}
	
}


// For debugging purposes.
strat.log = function() {
  // your code!
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

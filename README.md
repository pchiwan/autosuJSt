AutosuJSt
=========

An autosuggest control on steroids

# Introduction

I love challenges. Soon after I started working at a new company my PM expressed his wish for a particularly intricate feature to be included in the web application we were developing. This feature basically consisted in a JavaScript autosuggest control on steroids, which instantly got me excited since it seemed like a really cool tool to [try to] implement (actually what my PM was wishing for was some sort of Visual Studio's IntelliSense, and therefore I had to lower his expectations about it).

# Challenge accepted

"Oh c'mon, yet another autosuggest control? That is nothing new in the JS world!" I hear you say. You're right, there are literally dozens of really cool tools already implemented out there, such as jQuery's own [Autocomplete](http://jqueryui.com/autocomplete/), [typeahead.js](https://twitter.github.io/typeahead.js), or [select2](http://ivaynberg.github.io/select2), to mention just a few. But, even with their particular features and differences, they all work pretty much the same: provide the user with a list of possible values as she types, and allow her to select one of them. See what's missing? Select **ONE** of them.

## IntelliSense wannabe

If you've used Excel, any IDE, or the console of pretty much any browser's developer tools, you know what [intelligent code completion](http://en.wikipedia.org/wiki/Intelligent_code_completion) is. I wanted my control to work similarly, providing this suggestion-and.autocompletion functionality not once but permanently.

# Implementation

So I started looking at the peak of the mountain, wondering where the heck I could start climbing it from. I turned to Google for some inspiration to get me rolling and I found exactly what I needed. I could not believe my eyes, it was JavaScript genius [Nicholas C. Zakas](http://www.nczonline.net) coming to my rescue, again!

Several years ago Mr. Zakas published a great article on [how to create an autosuggest Textbox with JavaScript](http://oak.cs.ucla.edu/cs144/projects/javascript/suggest1.html), followed up by parts [2](http://oak.cs.ucla.edu/cs144/projects/javascript/suggest2.html) and [3](http://oak.cs.ucla.edu/cs144/projects/javascript/suggest3.html). I started building my `AutosuJSt` control around Nicholas' source code, so a huge deal of the credit goes to him. Thanks Nick!
  
# Shut up already. How does it work?

First of all I have to warn you that I messed the originally-very-simple code by adding some dependencies (my bad, but I'm sure you can deal with it). First of all you'll need jQuery, and then also my own version of [textarea-caret-position](https://github.com/component/textarea-caret-position) by [Jonathan Ong](https://github.com/jonathanong) and [Dan Dascalescu](https://github.com/dandv) at [Components](https://github.com/component), which extends jQuery with the method `getCaretCoords`. You can download it from my repository as well.
 
## Initialization

Here's how you initialize an `AutosuJSt` control.

```javascript
var oTextbox = document.getElementById("txt1");

var dataSource = [
    { name: 'Alabama'        , code: 'AL' },
    { name: 'Alaska'         , code: 'AK' },
    { name: 'Arizona'        , code: 'AZ' },
    ...
    { name: 'West Virginia'  , code: 'WV' },
    { name: 'Wisconsin'      , code: 'WI' },
    { name: 'Wyoming'        , code: 'WY' }                
];

new AutosuJSt(oTextbox, dataSource);
```

First parameter you'll be providing to the constructor is the actual input that you want to bind `AutosuJSt`'s functionality to. The second parameter is the suggestions data source. This data source can either be a simple array of strings, or an array of JavaScript objects. If you choose to use an array of JavaScript objects, though, you will have to do a bit more of work to instantiate an `AutosuJSt` control. Keep reading to find out how.

## Options

You can customize `AutosuJSt`'s behavior a bit by providing any of the following options on instantiation.

### displayKey

When using an array of JavaScript objects as your suggestions data source, you must specify which object property holds the value to be used as suggestion.
I.e.: For `{ name: 'New York', code: 'NY' }`, you would probably specify `displayKey: 'name'`.

### mappingFunc

This specifies the function that will be used to map data source items to suggestion list items. In other words, this is how you can provide your own markup for the suggestion list items. The default definition of the mapping function is as follows.

```javascript
function (sItem, iIndex) { 
	return '<li' + (iIndex == 0 ? ' class="highlighted"' : '') + '>' + self.getValue(sItem) +'</li>';
}
```
    
When specifying your own mapping function, make sure to provide it with two parameters. The first one is the data source's item currently being mapped, and the second one is the index of that element in the data source.

### matchingFunc

This specifies the matching function that will be used to filter data source entries with the input text. The default definition of the matching function is as follows.

```javascript
function (sItem, rCompare) {
	return rCompare.test(self.getValue(sItem));
}
```
    
When specifying your own matching function, make sure to provide it with two parameters. The first one is the entry of the data source being matched, and the second one is a regular expression (RegExp) of the input text.

## Example

Here's a complete example where we use an array of JavaScript objects as data source, and provide specific mapping and matching functions as well. This is the very definition of the `AutosuJSt` control you can play with in the Demo section.

```javascript
var oTextbox = document.getElementById("textarea1");

var states = [
	{ name: 'Alabama'        , code: 'AL' },
	{ name: 'Alaska'         , code: 'AK' },
	{ name: 'Arizona'        , code: 'AZ' },
	...
	{ name: 'West Virginia'  , code: 'WV' },
	{ name: 'Wisconsin'      , code: 'WI' },
	{ name: 'Wyoming'        , code: 'WY' }
];

new AutosuJSt(oTextbox, states, {
	displayKey: 'name',
	mappingFunc: function (sItem, iIndex) {
		return '<li' + (iIndex == 0 ? ' class="highlighted"' : '') + '>' + sItem.name + ' (' + sItem.code + ')' + '</li>'; 
	},
	matchingFunc: function (sItem, regExp) {
		return regExp.test(sItem.name.toLowerCase());
	}
});
```

## Styling

You can customize the suggestions container style by modifying my default stylesheet `autosujst.css`.

# Demo

You can play with my `AutosuJSt` control at this [jsFiddle](http://jsfiddle.net/pchiwan/gyb7wsju).



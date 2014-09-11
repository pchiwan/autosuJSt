/**
 * autosuggest.js
 * A Javascript autosuggest/typeahead control.
 * by Sílvia Mur Blanch aka PchiwaN 
 * https://github.com/pchiwan
 *
 * Based on "Creating an Autosuggest Textbox with JavaScript, Part 1"
 * http://oak.cs.ucla.edu/cs144/projects/javascript/suggest1.html
 * by JS genius Nicholas C. Zakas
 * http://www.nczonline.net/
 */

/**
 * AutosuJSt class
 * @scope public
 * @param oTextbox The textbox to capture.
 * @param aDataSource Array containing the suggestion list data source.
 * @param oOptions Dictionary of configuration options for the autosuggest control.
 * @@para displayKey
 *        When using a collection of objects as data source, this specifies which object key 
 *        holds the value to be used as suggestion. 
          I.e.: For "{name: 'New York', code: 'NY'}", displayKey: 'name'
 * @@para mappingFunc 
 *        Function that will be used to map the data source items to suggestions list items.
 *        Parameter 1: Element of array.
 *        Parameter 2: Index in array.
 * @@para matchingFunc 
 *        Function that will be used to filter data source entries with the input text.
 *        Parameter 1: Entry of the data source.
 *        Parameter 2: Regular expression (RegExp) of the input text.
 */
function AutosuJSt(oTextbox /*:HTMLInputElement*/, aDataSource /*:Array*/, oOptions /*:object*/) {
       
    //me, myself and I (always keep a reference to itself)
    var self = this;

    /**
     * Default options dictionary
     * @scope private
     */
    this.defaultOptions = {
        displayKey: '',
        mappingFunc: function (sItem, iIndex) { 
            return '<li' + (iIndex == 0 ? ' class="highlighted"' : '') + '>' + self.getValue(sItem) + '</li>';
        },
        matchingFunc: function (sItem, rCompare) {
            return rCompare.test(self.getValue(sItem));
        }
    };

    /**
     * The textbox to capture.
     * @scope private
     */
    this.textbox /*:HTMLInputElement*/ = oTextbox;

    /**
     * The configuration options.
     * @scope private
     */
    this.options /*:object*/ = $.extend({}, self.defaultOptions, oOptions);

    /**
     * The suggestions list container in the DOM.
     * @scope private
     */
    this.suggestionsContainer /*:jQuery Object*/;

    /**
     * Enumerator of key codes
     */
    var KeyCodes = {
        Backspace:      8,   
        Tab:            9,
        Enter:          13,
        Shift:          16,
        Ctrl:           17,  
        Alt:            18,
        PauseBreak:     19,
        CapsLock:       20,
        Escape:         27,
        Spacebar:       32,
        PageUp:         33,
        PageDown:       34,
        End:            35,
        Home:           36,
        ArrowLeft:      37,
        ArrowUp:        38,
        ArrowRight:     39,
        ArrowDown:      40,
        PrintScreen:    44,
        Insert:         45,
        Delete:         46,
        F1:             112,
        F2:             113,
        F3:             114,
        F4:             115,
        F5:             116,
        F6:             117,
        F7:             118,
        F8:             119,
        F9:             120,
        F10:            121,
        F11:            122,
        F12:            123
    }; 
   
    //local variables
    var $textbox = $('#' + self.textbox.id),
        iCurrentSelection = 0,
        iExtraOffset = 20,
        iCurrentStart = 0,
        sCurrentValue = '',
        sPrevValues = '',
        aSuggestions = [];

    //#region Initialization method    
        
    /**
     * Initializes the textbox with event handlers for
     * auto suggest functionality.
     * @scope private
     */
    this.init = function () {

        //assign the onkeyup event handler
        self.textbox.onkeyup = function (oEvent /*:Event*/) {
        
            //check for the proper location of the event object
            if (!oEvent) {
                oEvent = window.event;
            }
            
            //call the handleKeyUp() method with the event object
            self.handleKeyUp(oEvent);
        };        

        //assign the onkeydown event handler
        self.textbox.onkeydown = function (oEvent /*:Event*/) {

            //check for the proper location of the event object
            if (!oEvent) {
                oEvent = window.event;
            }

            //call the handleKeyUp() method with the event object
            self.handleKeyDown(oEvent);
        };

        //create suggestions list
        self.suggestionsContainer = $('<ul class="suggestionsContainer"></ul>');

        //append suggestions list after the textbox
        $textbox.after(self.suggestionsContainer);
    };

    //#endregion

    //#region Event handling

    /**
     * Handles keyup events.
     * @scope private
     * @param oEvent The event object for the keyup event.
     */
    this.handleKeyUp = function (oEvent /*:Event*/) {

        var iKeyCode = oEvent.keyCode;

        if (iKeyCode >= KeyCodes.ArrowLeft && iKeyCode <= KeyCodes.ArrowDown) {
            //arrow key pressed: navigate the suggestions list
            self.navigateSuggestions(iKeyCode);
        }
        else {
            //make sure not to interfere with non-character keys
            if (iKeyCode <= KeyCodes.Home || (
                iKeyCode >= KeyCodes.PrintScreen && iKeyCode <= KeyCodes.Delete) || (
                iKeyCode >= KeyCodes.F1 && iKeyCode <= KeyCodes.F12)) {
                
                self.nonCharacterKeyHandling(iKeyCode, oEvent.ctrlKey);
            } 
            else {
                //request suggestions from the suggestion provider
                self.requestSuggestions();
            }
        }
    };

    /**
     * Handles keydown events.
     * @scope private
     * @param oEvent The event object for the keydown event.     
     */
    this.handleKeyDown = function (oEvent /*:Event*/) {

        var iKeyCode = oEvent.keyCode;

        switch (iKeyCode) {
            case KeyCodes.Spacebar:
                if (oEvent.ctrlKey) {
                    //show suggestion list with ALL possible values
                    self.requestSuggestions(true);
                    self.preventDefault(oEvent);
                }
                break;

            case KeyCodes.Tab:
            case KeyCodes.Enter:
                if (iCurrentSelection >= 0) {
                    //set value to textbox
                    self.textbox.value = sPrevValues + self.getValue(aSuggestions[iCurrentSelection]);

                    //hide suggestions list and accept current selection
                    self.suggestionsContainer.hide();
                    self.acceptSuggestion();
                    self.preventDefault(oEvent);
                }
                break;
        }
    };

    //#endregion

    //#region Methods

    /**
     * Autosuggests one or more suggestions for what the user has typed.
     * If no suggestions are passed in, then no autosuggest occurs.
     * @scope private
     * @param aSuggestions An array of suggestion strings.
     */
    this.autosuggest = function (_aSuggestions /*:Array*/) {
        
        aSuggestions = _aSuggestions;

        //empty suggestions list
        self.suggestionsContainer.empty();

        //make sure there's at least one suggestion
        if (aSuggestions.length > 0) {                            
            
            //append suggestions as list items
            self.suggestionsContainer.append(self.map(aSuggestions, self.options.mappingFunc).join(''));

            //calculate position to locate the list on screen
            var pos1 = $textbox.position();
            var pos2 = $textbox.getCaretCoords();
            self.suggestionsContainer.css('top', pos1.top + pos2.top + iExtraOffset);
            self.suggestionsContainer.css('left', pos1.left);            

            iCurrentSelection = 0;
            self.typeAhead(aSuggestions[iCurrentSelection]);
            self.suggestionsContainer.show();
        }
        else {
            //hide suggestions list if it has no results
            self.suggestionsContainer.hide();
        }
    };

    this.highlightSelection = function (bHighlight /*:boolean*/) {

        if (bHighlight) {
            self.suggestionsContainer.find('li:eq(' + iCurrentSelection + ')').addClass('highlighted');   
        }
        else {
            self.suggestionsContainer.find('li:eq(' + iCurrentSelection + ')').removeClass('highlighted');
        }
    };

    /**
     * Navigate the suggestions list with the arrow keys.
     * @scope private
     * @param iKeyCode The code of the key that was last pressed
     */
    this.navigateSuggestions = function (iKeyCode /*:int*/) {
        
        switch (iKeyCode) {
            case KeyCodes.ArrowLeft:
                //do nothing             
                return;
            
            case KeyCodes.ArrowUp: //navigate element up
            case KeyCodes.ArrowDown: //navigate element down
                self.highlightSelection(false);

                if (iKeyCode == KeyCodes.ArrowUp) {
                    iCurrentSelection = iCurrentSelection > 0 //current selection is greater than 0?
                        ? iCurrentSelection - 1 //move one position up the list
                        : aSuggestions.last(); //go around the list to the very last item
                }
                else {
                    iCurrentSelection = iCurrentSelection < aSuggestions.last()  //current selection is smaller than max?
                    ? iCurrentSelection + 1 //move one position down the list
                    : 0; //go around the list to the very first item    
                }

                self.highlightSelection(true);
                self.typeAhead(aSuggestions[iCurrentSelection]);
                break;

            case KeyCodes.ArrowRight: //hide suggestion list and accept current selection
                self.suggestionsContainer.hide();
                self.acceptSuggestion();
                break;
        }        
    };

    /**
     * Handle the non-character keys keys
     * @scope private
     * @param iKeyCode The code of the key that was last pressed
     * @param bCtrlKey Indicates whether the control key was pressed as well
     */
    this.nonCharacterKeyHandling = function (iKeyCode /*:int*/, bCtrlKey /*:boolean*/) {

        switch (iKeyCode) {            
            case KeyCodes.Escape: //hide suggestions list
                self.suggestionsContainer.hide();
                break;
        }
    };

    /**
     * Accept currently selected suggestion and clean slate for next one.
     * @scope private
     */
    this.acceptSuggestion = function () {

        sCurrentValue = '';
        iCurrentSelection = -1;
        self.selectRange(self.textbox.value.length, self.textbox.value.length);
    };    

    /**
     * Selects a range of text in the textbox.
     * @scope private
     * @param iStart The start index (base 0) of the selection.
     * @param iLength The number of characters to select.
     */
    this.selectRange = function (iStart /*:int*/, iLength /*:int*/) {

        //use text ranges for Internet Explorer
        if (self.textbox.createTextRange) {

            var oRange = self.textbox.createTextRange(); 
            oRange.moveStart('character', iStart); 
            oRange.moveEnd('character', iLength - iStart);
            oRange.select();
            
        //use setSelectionRange() for Mozilla/Webkit
        } 
        else if (self.textbox.setSelectionRange) {
            self.textbox.setSelectionRange(iStart, iLength);
        }       

        //set focus back to the textbox
        self.textbox.focus();      
    }; 

    /**
     * Inserts a suggestion into the textbox, highlighting the 
     * suggested part of the text.
     * @scope private
     * @param oSuggestion The suggestion for the textbox.
     */
    this.typeAhead = function (oSuggestion /*:String*/) {

        //check for support of typeahead functionality
        if (self.textbox.createTextRange || self.textbox.setSelectionRange) {

            self.textbox.value = sPrevValues + self.getValue(oSuggestion);
            self.selectRange(iCurrentStart, self.textbox.value.length);
        }
    };

    /**
     * Request suggestions for the control. 
     * @scope private
     * @param bForceShow Show suggestions list even if the autosuggest control has no value.
     */
    this.requestSuggestions = function (bForceShow /*:boolean*/) {
        
        var aSuggestions = [];

        /*
         * I can use this regular expression to split the textbox's value in words
         * treating spaces, tabs, and carriage returns the same way. 
         * But I'll try a different approach and omit this behavior.
         */
        //var sValues = self.textbox.value.split(/[\s]+/);

        //split textbox's value in words
        var aValues = self.textbox.value.split(' ');

        if (!aValues.length && !bForceShow) 
            return; // bye bye
        
        self.parseInput(aValues);

        if (bForceShow) {
            //provide suggestions to the control
            self.autosuggest(aDataSource);
            return;
        }

        if (sCurrentValue.length > 0){
        
            //create regular expression out of the current value
            //search for strings starting with current value and ignore case
            var regExp = new RegExp('^' + sCurrentValue, 'i');

            //search for matching items
            for (var i = 0; i < aDataSource.length; i++) { 
                if (self.options.matchingFunc(aDataSource[i], regExp)) {
                    aSuggestions.push(aDataSource[i]);
                } 
            }
        }

        //provide suggestions to the control
        self.autosuggest(aSuggestions);
    };

    /**
     * Parse the textbox's value and collect necessary data for the typeahead process.
     * @scope private
     * @param aValues Array of strings.
     */
    this.parseInput = function (aValues /*:Array*/) {

        //check whether last element of the array contains a carriage return
        var iIndexOf = aValues.getLast().lastIndexOf('\n');
        if (iIndexOf >= 0) {
            sItem = aValues.pop();
            aValues.push(sItem.substr(0, ++iIndexOf));
            aValues.push(iIndexOf < sItem.length ? sItem.substr(iIndexOf) : ' ');
        }

        // pick last element of array which is the last word entered in the textbox
        sCurrentValue = aValues.getLast();

        //join all words minus the last one
        sPrevValues = aValues.slice(0, aValues.last()).join(' ');
        //add an empty space at the end only if last character isn't a carriage return
        if (aValues.length > 1 && sPrevValues.lastChar() != '\n') {
            sPrevValues += ' ';
        }

        //get actual starting point for the suggestion text to be highlighted
        iCurrentStart = sPrevValues.length + sCurrentValue.length;
    }

    //#endregion

    //#region Utilities

    /**
     * Returns a suggestion's value.
     * @scope private
     * @param oSuggestion Suggestion object.
     */
    this.getValue = function (oSuggestion /*:Object*/) {

        return !!self.options.displayKey 
            ? oSuggestion[self.options.displayKey]
            : oSuggestion;
    };

    /**
     * Prevent event's default behavior.
     * @scope private 
     * @param oEvent Event object.
     */
    this.preventDefault = function (oEvent /*:Event*/) {

        if (oEvent.preventDefault) {
            //for all browsers except IE
            oEvent.preventDefault();
        }
        else {
            //for IE
            oEvent.returnValue = false;
        }
    };

    /**
     * A custom map method (because it's supposed to be much faster than jQuery's and Array's own).
     * @scope private
     * @param aItems The array of items to be mapped.
     * @param fCallback The mapping function.
     */
    this.map = function (aItems /*:Array*/, fCallback /*:Function*/) {
        
        var ret = []
        for (var i = 0; i < aItems.length; i++) {
            ret.push(fCallback(aItems[i], i));
        }
        return ret;
    }

    /**
     * String extension method that returns the last character of the string.
     * @scope private
     */
    String.prototype.lastChar = function () {

        return this[this.length - 1];
    };

    /**
     * Array extension method that returns the last item of the array.
     * @scope private
     */
    Array.prototype.getLast = function () {

        return this[this.length - 1];
    };

    /**
     * Array extension method that returns its current length - 1.
     * @scope private
     */
    Array.prototype.last = function () { 
        
        return this.length -1; 
    };

    //#endregion

    //----------------------------------------

    //initialize the control
    self.init();
};

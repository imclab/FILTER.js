/**
*
* Custom Filter(s)
*
* Allows to create an filter on-the-fly using an inline function
*
* @param handler Optional (the filter apply routine)
* @package FILTER.js
*
**/
(function(FILTER, undef){
    
    //
    //
    //  Custom Filter 
    //  used as a placeholder for constructing filters inline with an anonymous function
    var CustomFilter = FILTER.CustomFilter = FILTER.Extends( FILTER.Filter,
    {
        
        name : "CustomFilter",
        
        constructor : function(handler) {
            this._handler = handler;
        },
        
        _handler : null,
        
        _apply : function(im, w, h, image) {
            if ( !this._isOn || !this._handler ) return im;
            return this._handler.call(this, im, w, h, image);
        },
        
        apply : function(image) {
            if ( this._isOn && this._handler )
                return image.setData(this._handler.call(this, image.getData(), image.width, image.height, image));
            return image;
        }
    });
    
})(FILTER);
/**
*
* Table Lookup Filter
*
* Changes target image colors according to color lookup tables for each channel
*
* @param tableR Optional (a lookup table of 256 color values for red channel)
* @param tableG Optional (a lookup table of 256 color values for green channel)
* @param tableB Optional (a lookup table of 256 color values for blue channel)
* @param tableA Optional (a lookup table of 256 color values for alpha channel, NOT USED YET)
* @package FILTER.js
*
**/
(function(FILTER, undef){
    
    // color table
    var CT=FILTER.ImArrayCopy, clamp = FILTER.Color.clampPixel,
    
        eye = function(inv) {
            var t=new CT(256), i=0;
            if (inv)  while (i<256) { t[i]=255-i; i++; }
            else   while (i<256) { t[i]=i; i++; }
            return t;
        },
    
        ones = function(col) {
            var t=new CT(256), i=0;
            while (i<256) { t[i]=col; i++; }
            return t;
        },
        
        clone = function(t) {
            if (t) return new CT(t);
            return null;
        },
        
        Power=Math.pow, Exponential=Math.exp, nF=1/255, trivial=eye(), inverce=eye(1)
    ;
    
    //
    //
    // TableLookupFilter
    var TableLookupFilter = FILTER.TableLookupFilter = FILTER.Extends( FILTER.Filter,
    {
        
        name : "TableLookupFilter",
        
        constructor : function(tR, tG, tB, tA) {
            this._tableR=tR || null;
            this._tableG=tG || this._tableR;
            this._tableB=tB || this._tableG;
            this._tableA=tA || null;
        },
        
        // parameters
        _tableR : null,
        _tableG : null,
        _tableB : null,
        _tableA : null,
        
        thresholds : function(thresholdsR, thresholdsG, thresholdsB) {
            // assume thresholds are given in pointwise scheme as pointcuts
            // not in cumulative scheme
            // [ 0.5 ] => [0, 1]
            // [ 0.3, 0.3, 0.3 ] => [0, 0.3, 0.6, 1]
            if (!thresholdsR.length) thresholdsR=[thresholdsR];
            if (!thresholdsG) thresholdsG=thresholdsR;
            if (!thresholdsB) thresholdsB=thresholdsG;
            /*
            // sort them into ascending order
            thresholds.sort();
            thresholds.shift(0);
            */
            var tLR=thresholdsR.length, numLevelsR=tLR+1, 
                tLG=thresholdsG.length, numLevelsG=tLG+1, 
                tLB=thresholdsB.length, numLevelsB=tLB+1, 
                tR=new CT(256), qR=new CT(numLevelsR), 
                tG=new CT(256), qG=new CT(numLevelsG), 
                tB=new CT(256), qB=new CT(numLevelsB), 
                i, j, nLR=255/(numLevelsR-1), nLG=255/(numLevelsG-1), nLB=255/(numLevelsB-1)
            ;
            i=0; while (i<numLevelsR) { qR[i] = ~~(nLR * i); i++; }
            thresholdsR[0]=~~(255*thresholdsR[0]);
            i=1; while (i<tLR) { thresholdsR[i]=thresholdsR[i-1] + ~~(255*thresholdsR[i]); i++; }
            i=0; while (i<numLevelsG) { qG[i] = ~~(nLG * i); i++; }
            thresholdsG[0]=~~(255*thresholdsG[0]);
            i=1; while (i<tLG) { thresholdsG[i]=thresholdsG[i-1] + ~~(255*thresholdsG[i]); i++; }
            i=0; while (i<numLevelsB) { qB[i] = ~~(nLB * i); i++; }
            thresholdsB[0]=~~(255*thresholdsB[0]);
            i=1; while (i<tLB) { thresholdsB[i]=thresholdsB[i-1] + ~~(255*thresholdsB[i]); i++; }
            /*q[0]=0;
            i=1; while (i<numLevels-1) { thresholds[i-1]=~~(255*thresholds[i-1]); q[i] = q[i-1] + thresholds[i-1]; i++; }
            q[numLevels-1]=255;*/
            //i=0; while (i<numLevels) { q[i] = ~~(255*thresholds[i]); i++; }
            i=0; 
            while (i<256) 
            { 
                // the non-linear mapping is here
                j=0; while (j<tLR && i>thresholdsR[j]) j++;
                tR[ i ] = clamp(qR[ j ]); 
                j=0; while (j<tLG && i>thresholdsG[j]) j++;
                tG[ i ] = clamp(qG[ j ]); 
                j=0; while (j<tLB && i>thresholdsB[j]) j++;
                tB[ i ] = clamp(qB[ j ]); 
                i++; 
            }
            return this.set(tR, tG, tB);
        },
        
        threshold : function(thresholdR, thresholdG, thresholdB) {
            thresholdR=thresholdR || 0.5;
            thresholdG=thresholdG || thresholdR;
            thresholdB=thresholdB || thresholdG;
            return this.thresholds([thresholdR], [thresholdG], [thresholdB]);
        },
        
        quantize : function(numLevels) {
            if ( numLevels === undef ) numLevels=64;
            if (numLevels<2) numLevels=2;
            /*var n=~~(255/numLevels), qL=0, t=new CT(256), i=0;
            while (i<256) { if (0==i%n) qL+=n; t[i]=qL; i++; }
            return this.set(t, t, t);*/
            var t=new CT(256), q=new CT(numLevels), i, nL=255/(numLevels-1), nR=numLevels/256;
            i=0; while (i<numLevels) { q[i] = ~~(nL * i); i++; }
            i=0; while (i<256) { t[i] = clamp(q[ ~~(nR * i) ]); i++; }
            return this.set(t);
        },
        
        binarize : function() {
            return this.quantize(2);
        },
        
        // adapted from http://www.jhlabs.com/ip/filters/
        solarize : function(threshold) {
            if ( threshold === undef ) threshold=0.5;
            //threshold=threshold*256; 
            
            var i=0, t=new CT(256)
                ,q, c, n=2/255
            ;
            
            i=0; 
            while (i<256) 
            { 
                q = n*i; 
                c = (q>threshold) ? (255-255*q) : (255*q-255); 
                t[i] = ~~(clamp( c ));
                //t[i] = clamp( (i>threshold) ? 255-(i<<1) : (i<<1)-255 ); 
                //t[i] = clamp( (i>threshold) ? 255-i : i-255 ); 
                i++; 
            }
            return this.set(t);
        },
        
        solarize2 : function(threshold) {
            if ( threshold === undef ) threshold=0.5;
            //threshold=threshold*256; 
            threshold=1-threshold;
            var i=0, t=new CT(256)
                ,q, c, n=2/255
            ;
            
            i=0; 
            while (i<256) 
            { 
                q = n*i; 
                c = (q<threshold) ? (255-255*q) : (255*q-255); 
                t[i] = ~~(clamp( c ));
                //t[i] = clamp( (i>threshold) ? 255-(i<<1) : (i<<1)-255 ); 
                //t[i] = clamp( (i>threshold) ? 255-i : i-255 ); 
                i++; 
            }
            return this.set(t);
        },
        
        solarizeInverse : function(threshold) {
            if ( threshold === undef ) threshold=0.5;
            threshold*=256; 
            
            var i=0, t=new CT(256);
            i=0; 
            while (i<256) 
            { 
                t[i] = (i>threshold) ? 255-i : i; 
                i++; 
            }
            return this.set(t);
        },
        
        invert : function() {
            /*var i=0, t=new CT(256);
            i=0; while (i<256) { t[i]=255-i; i++; }*/
            return this.set(inverce);
        },
        
        // apply a binary mask to the image color channels
        mask : function(mask) {
            var i=0, maskR=(mask>>16)&255, maskG=(mask>>8)&255, maskB=mask&255;
                tR=new CT(256), tG=new CT(256), tB=new CT(256)
                ;
            i=0; while (i<256) 
            { 
                tR[i]=clamp(i & maskR); 
                tG[i]=clamp(i & maskG); 
                tB[i]=clamp(i & maskB); 
                i++; 
            }
            return this.set(tR, tG, tB);
        },
        
        // replace a color with another
        replace : function(color, replacecolor) {
            if (color==replacecolor) return this;
            var  
                c1R=(color>>16)&255, c1G=(color>>8)&255, c1B=(color)&255, 
                c2R=(replacecolor>>16)&255, c2G=(replacecolor>>8)&255, c2B=(replacecolor)&255, 
                tR=clone(trivial), tG=clone(trivial), tB=clone(trivial)
                ;
                tR[c1R]=c2R; tG[c1G]=c2G; tB[c1B]=c2B;
            return this.set(tR, tG, tB);
        },
        
        // extract a range of color values from a specific color channel and set the rest to background color
        extract : function(channel, range, background) {
            if (!range || !range.length) return this;
            
            background=background||0;
            var  
                bR=(background>>16)&255, bG=(background>>8)&255, bB=(background)&255, 
                tR=ones(bR), tG=ones(bG), tB=ones(bB),
                s, f
                ;
            switch(channel)
            {
                case FILTER.CHANNEL.BLUE: 
                    s=range[0]; f=range[1];
                    while (s<=f) { tB[s]=clamp(s); s++; }
                    break;
                
                case FILTER.CHANNEL.GREEN: 
                    s=range[0]; f=range[1];
                    while (s<=f) { tG[s]=clamp(s); s++; }
                    break;
                
                case FILTER.CHANNEL.RED: 
                default:
                    s=range[0]; f=range[1];
                    while (s<=f) { tR[s]=clamp(s); s++; }
                    break;
                
            }
            return this.set(tR, tG, tB);
        },
        
        // adapted from http://www.jhlabs.com/ip/filters/
        gammaCorrection : function(gammaR, gammaG, gammaB) {
            gammaR=gammaR || 1;
            gammaG=gammaG || gammaR;
            gammaB=gammaB || gammaG;
            
            // gamma correction uses inverse gamma
            gammaR=1.0/gammaR; gammaG=1.0/gammaG; gammaB=1.0/gammaB;
            
            var tR=new CT(256), tG=new CT(256), tB=new CT(256), i=0;
            while (i<256) 
            { 
                tR[i]=clamp(~~(255*Power(nF*i, gammaR))); 
                tG[i]=clamp(~~(255*Power(nF*i, gammaG))); 
                tB[i]=clamp(~~(255*Power(nF*i, gammaB)));  
                i++; 
            }
            return this.set(tR, tG, tB);
        },
        
        // adapted from http://www.jhlabs.com/ip/filters/
        exposure : function(exposure) {
            if ( exposure === undef ) exposure=1;
            var i=0, t=new CT(256);
            i=0; while (i<256) 
            { 
                t[i]=clamp(~~(255 * (1 - Exponential(-exposure * i *nF)))); 
                i++; 
            }
            return this.set(t);
        },
        
        set : function(_tR, _tG, _tB, _tA) {
            if (!_tR) return this;
            
            _tG=_tG || _tR; _tB=_tB || _tG;
            var 
                tR=this._tableR || eye(), tG, tB, tA,
                tR2=clone(tR), tG2, tB2, tA2,
                i;
            
            if (_tG && _tB)
            {
                tG=this._tableG || clone(tR); tB=this._tableB || clone(tG);
                tG2=clone(tG); tB2=clone(tB);
                // concat/compose the filter's tables, same as composing the filters
                i=0; 
                while (i<256) 
                { 
                    tR[i]=clamp( _tR[clamp( tR2[i] )] ); 
                    tG[i]=clamp( _tG[clamp( tG2[i] )] ); 
                    tB[i]=clamp( _tB[clamp( tB2[i] )] ); 
                    i++; 
                }
                this._tableR=tR; this._tableG=tG; this._tableB=tB;
            }
            else
            {
                // concat/compose the filter's tables, same as composing the filters
                i=0; 
                while (i<256) 
                { 
                    tR[i]=clamp( _tR[clamp( tR2[i] )] ); 
                    i++; 
                }
                this._tableR=tR; this._tableG=this._tableR; this._tableB=this._tableR;
            }
            
            return this;
        },
        
        reset : function() {
            this._tableR=null; this._tableG=null; this._tableB=null; this._tableA=null; 
            return this;
        },
        
        combineWith : function(filt) {
            return this.set(filt.getTable(0), filt.getTable(1), filt.getTable(2));
        },
        
        getTable : function (channel) {
            channel=channel||FILTER.CHANNEL.RED;
            switch (channel)
            {
                case FILTER.CHANNEL.ALPHA: return this._tableA;
                case FILTER.CHANNEL.BLUE: return this._tableB;
                case FILTER.CHANNEL.GREEN: return this._tableG;
                case FILTER.CHANNEL.RED: 
                default: return this._tableR;
            }
        },
        
        setTable : function (table, channel) {
            channel=channel||FILTER.CHANNEL.RED;
            switch (channel)
            {
                case FILTER.CHANNEL.ALPHA: this._tableA=table; return this;
                case FILTER.CHANNEL.BLUE: this._tableB=table; return this;
                case FILTER.CHANNEL.GREEN: this._tableG=table; return this;
                case FILTER.CHANNEL.RED: 
                default: this._tableR=table; return this;
            }
        },
        
        // used for internal purposes
        _apply : function(im, w, h/*, image*/) {
            if ( !this._isOn || !this._tableR ) return im;
            
            var l=im.length, i=0, r, g, b, a,
                tR=this._tableR, tG=this._tableG, tB=this._tableB, tA=this._tableA;
            
            // apply filter (algorithm implemented directly based on filter definition)
            if (tA)
            {
                while (i<l)
                {
                    r=im[i]; g=im[i+1]; b=im[i+2]; a=im[i+3];
                    im[i]=tR[r]; im[i+1]=tG[g]; im[i+2]=tB[b]; im[i+3]=tA[a];
                    i+=4;
                }
            }
            else
            {
                while (i<l)
                {
                    r=im[i]; g=im[i+1]; b=im[i+2];
                    im[i]=tR[r]; im[i+1]=tG[g]; im[i+2]=tB[b];
                    i+=4;
                }
            }
            return im;
        },
        
        apply : function(image) {
            if ( this._isOn && this._tableR )
                return image.setData(this._apply(image.getData(), image.width, image.height, image));
            return image;
        },
    });
    // aliases
    TableLookupFilter.prototype.posterize = TableLookupFilter.prototype.levels = TableLookupFilter.prototype.quantize;
    
})(FILTER);
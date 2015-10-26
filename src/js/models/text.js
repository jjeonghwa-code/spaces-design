/*
 * Copyright (c) 2014 Adobe Systems Incorporated. All rights reserved.
 *  
 * Permission is hereby granted, free of charge, to any person obtaining a
 * copy of this software and associated documentation files (the "Software"), 
 * to deal in the Software without restriction, including without limitation 
 * the rights to use, copy, modify, merge, publish, distribute, sublicense, 
 * and/or sell copies of the Software, and to permit persons to whom the 
 * Software is furnished to do so, subject to the following conditions:
 *  
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *  
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, 
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER 
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING 
 * FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER 
 * DEALINGS IN THE SOFTWARE.
 * 
 */

define(function (require, exports, module) {
    "use strict";

    var Immutable = require("immutable");

    var CharacterStyle = require("./characterstyle"),
        ParagraphStyle = require("./paragraphstyle");

    /**
     * Represents the style and context of a text layer
     * 
     * @constructor
     */
    var Text = Immutable.Record({
        /**
         * Uniform character style of multiple text ranges. If text has one text range, then `characterStyle`
         * equals to `firstCharacterStyle`. Attribute will be null if multiple text ranges have mixed value.
         *
         * @type {CharacterStyle}
         */
        characterStyle: null,
        
        /**
         * The first character style in the text ranges
         *
         * @type {CharacterStyle}
         */
        firstCharacterStyle: null,

        /**
         * @type {ParagraphStyle}
         */
        paragraphStyle: null,

        /**
         * Indicates whether the text flows within a bounding box.
         * @type {boolean} 
         */
        box: null
    });

    /**
     * Construct a list of new Text models from the given descriptor, or return null
     * if there are no text styles, e.g., if the descriptors do not describe a text layer.
     * 
     * @static
     * @param {object} documentDescriptor
     * @param {object} layerDescriptor
     * @return {?Immutable.List.<Text>}
     */
    Text.fromLayerDescriptor = function (documentDescriptor, layerDescriptor) {
        if (!layerDescriptor.hasOwnProperty("textKey")) {
            return null;
        }

        var model = {},
            textKey = layerDescriptor.textKey,
            textShapes = textKey.textShape;

        if (textShapes.length !== 1) {
            throw new Error("Too many text shapes!");
        }
        
        var textStyles = CharacterStyle.fromTextDescriptor(documentDescriptor, layerDescriptor, textKey);
        
        model.characterStyle = textStyles.uniformCharStyle;
        model.firstCharacterStyle = textStyles.firstCharStyle;
        model.paragraphStyle = ParagraphStyle.fromTextDescriptor(documentDescriptor, layerDescriptor, textKey);
        model.box = textShapes[0].char._value === "box";

        return new Text(model);
    };

    module.exports = Text;
});

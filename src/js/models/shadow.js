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

    var Immutable = require("immutable"),
        mathjs = require("mathjs"),
        _ = require("lodash");

    var Color = require("./color"),
        objUtil = require("js/util/object");

    /**
     * Given an angle and distance (polar coordinates), calculate the appropriate x/y coordinates in pixels
     *
     * @private
     * @param {number} angle angle in degrees
     * @param {number} distance distance in pixels
     *
     * @return {{x: number, y: number}} object containing numerical x/y values
     */
    var _calculateCartesianCoords = function (angle, distance) {
        var angleRads = angle * (Math.PI / 180.0);
        return {
            x: mathjs.round(-Math.cos(angleRads) * distance, 2),
            y: mathjs.round(Math.sin(angleRads) * distance, 2)
        };
    };

    /**
     * Given an x,y coordinate pair, calculate the appropriate polar coordinates
     * distance in pixels, and angle in degrees
     *
     * @private
     * @param {number} x x coordinate in pixels
     * @param {number} y y coordinate in pixels
     *
     * @return {{distance: number, angle: number}} object containing distance in pixels and angle in degrees
     */
    var _calculatePolarCoords = function (x, y) {
        if (!_.isNumber(x) || !_.isNumber(y)) {
            return null;
        }
        return {
            distance: mathjs.round(Math.sqrt((y * y) + (x * x)), 2),
            angle: mathjs.round(Math.atan2(y, -x) * (180 / Math.PI), 2)
        };
    };

    /**
     * Model for a Photoshop layer shadow.
     * 
     * @constructor
     * @param {object} model
     */
    var Shadow = Immutable.Record({
        /**
         * @type {boolean} True if shadow is enabled
         */
        enabled: true,

        /**
         * @type {Color} Color of the shadow
         */
        color: Color.DEFAULT,

        /**
         * @type {number} x coordinate of the shadow
         */
        x: 0,

        /**
         * @type {number} y coordinate of the shadow
         */
        y: 5,

        /**
         * @type {number} blur size in pixels
         */
        blur: 5,

        /**
         * @type {number} spread size in pixels
         */
        spread: 5,

        /**
        * @type {BlendMode} blend mode of the shadow
        */
        blendMode: "multiply"

    });

    /**
     * Represent this shadow in an intermediate format that is useful to playground-adapter
     * This includes renaming some properties, and converting from cart to polar coords
     *
     * @return {object} photoshop-like object representation of a shadow layer effect
     */
    Shadow.prototype.toAdapterObject = function () {
        var polarCoords = _calculatePolarCoords(this.x, this.y);
        return {
            enabled: this.enabled,
            color: this.color,
            opacity: this.color && this.color.opacity,
            chokeMatte: this.spread,
            blur: this.blur,
            localLightingAngle: polarCoords && polarCoords.angle,
            distance: polarCoords && polarCoords.distance,
            useGlobalAngle: false, // Force this
            blendMode: this.blendMode
        };
    };

    /**
     * Construct a shadow model from a Photoshop descriptor. The descriptor
     * is typically included as layerEffects._value.shadow property of a layer.
     * 
     * @param {object} shadowDescriptor
     * @param {number} globalLightingAngle 
     * @return {Shadow}
     */
    Shadow.fromShadowDescriptor = function (shadowDescriptor, globalLightingAngle) {
        var model = {},
            shadow = shadowDescriptor._value;

        model.enabled = shadow.enabled;

        var opacity = objUtil.getPath(shadow, "opacity._value"),
            rawColor = objUtil.getPath(shadow, "color._value");

        model.color = Color.fromPhotoshopColorObj(rawColor, opacity);

        var angle = objUtil.getPath(shadow, "localLightingAngle._value"),
            distance = objUtil.getPath(shadow, "distance._value");

        if (objUtil.getPath(shadow, "useGlobalAngle")) {
            angle = globalLightingAngle;
        }

        var coords = _calculateCartesianCoords(angle, distance);

        model.x = coords.x;
        model.y = coords.y;

        model.blur = objUtil.getPath(shadow, "blur._value");
        model.spread = objUtil.getPath(shadow, "chokeMatte._value");

        model.blendMode = objUtil.getPath(shadow, "mode._value");

        return new Shadow(model);
    };

    /**
     * Construct a list of Shadow models from a Photoshop layer descriptor.
     * 
     * @param {object} layerDescriptor
     * @return {Immutable.List.<Shadow)}
     */
    Shadow.fromLayerDescriptor = function (layerDescriptor, kind) {
        var layerEffects = layerDescriptor.layerEffects;
        if (!layerEffects) {
            return Immutable.List();
        }

        var shadowDescriptors = objUtil.getPath(layerDescriptor, "layerEffects._value." + kind + "Multi");
        if (!shadowDescriptors) {
            shadowDescriptors = [objUtil.getPath(layerDescriptor, "layerEffects._value." + kind)];
        }

        return Immutable.List(shadowDescriptors.reduce(function (result, shadowDescriptor) {
            // the enabled state should also respect the "master" layerFXVisible flag
            shadowDescriptor._value.enabled =
                shadowDescriptor._value.enabled && layerDescriptor.layerFXVisible;

            if (shadowDescriptor._value.present) {
                result.push(Shadow.fromShadowDescriptor(shadowDescriptor, layerDescriptor.globalAngle));
            }
            return result;
        }, []));
    };

    module.exports = Shadow;
});

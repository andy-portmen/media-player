/* 
  Menucool Color Picker v2012.10.23. http://www.menucool.com/color-picker 
*/

var MC = MC || {};
MC.cpInitOnDomReady = true;

MC.cPC = function(a, b) {
    typeof OnColorChanged !== "undefined" && OnColorChanged(a, b)
};
MC.ColorPicker = function() {
    "use strict";
    var b = function(a, b, c) {
            if (a.addEventListener) a.addEventListener(b, c, false);
            else if (a.attachEvent) a.attachEvent("on" + b, c);
            else a["on" + b] = c
        },
        e = function(a) {
            if (!a) return 0;
            var b = /(^| )color( |$)/;
            return b.test(a)
        },
        a, d = function() {
            var a = this;
            a.a = a.b = a.c = null;
            a.i = -1;
            a.R = [];
            a.S = [];
            a.h()
        };
    d.prototype = {
        d: function(b) {
            var a = document.createElement("div");
            a.className = "clear";
            b.appendChild(a)
        },
        e: function(b, c, d) {
            var a = document.createElement("div");
            if (b == "TT") {
                a.className = "transChooser";
                a.setAttribute("rgb", "transparent")
            } else {
                a.style.backgroundColor = "#" + b + d + c;
                a.setAttribute("rgb", "#" + b + d + c)
            }
            return a
        },
        f: function(a) {
            a.cancelBubble = true;
            a.f && a.f()
        },
        g: function() {
            for (var a = this, c, b = a.c, i = ["00", "00", "11", "22", "33", "44", "55", "66", "77", "88", "99", "AA", "BB", "CC", "DD", "EE", "FF", "TT"], h = 0; h < 18; h++) {
                c = a.e(i[h], i[h], i[h]);
                b.appendChild(c)
            }
            a.d(b);
            for (var e = ["00", "33", "66", "99", "CC", "FF"], d = 0; d < 6; d++) {
                for (var g = 0; g < 3; g++)
                    for (var f = 0; f < 6; f++) {
                        c = a.e(e[g], e[f], e[d]);
                        b.appendChild(c)
                    }
                a.d(b)
            }
            a.d(b);
            for (var d = 0; d < 6; d++) {
                for (var g = 3; g < 6; g++)
                    for (var f = 0; f < 6; f++) {
                        c = a.e(e[g], e[f], e[d]);
                        b.appendChild(c)
                    }
                a.d(b)
            }
        },
        h: function() {
            var a = this;
            a.r = document.createElement("div");
            a.r.id = "colorpicker";
            a.a = document.createElement("div");
            a.a.id = "hexBox";
            a.b = document.createElement("div");
            a.b.id = "bgBox";
            a.c = document.createElement("div");
            a.c.id = "colorContainer";
            a.j();
            a.r.appendChild(a.a);
            a.r.appendChild(a.b);
            a.r.appendChild(a.c);
            a.g();
            a.m();
            b(document.body, "click", function() {
                if (a.i > -1) a.S[a.i].style.zIndex = 1;
                a.o()
            });
            typeof OnColorPickerLoaded !== "undefined" && OnColorPickerLoaded()
        },
        j: function() {
            var a = this;
            b(a.c, "mouseover", a.k);
            b(a.c, "click", a.l)
        },
        k: function(b) {
            if (b.target) var c = b.target;
            else c = b.srcElement;
            if (c.id != "colorContainer") a.b.style.backgroundColor = a.a.textContent = c.getAttribute("rgb");
            a.f(b)
        },
        l: function(c) {
            if (c.target) var b = c.target;
            else b = c.srcElement;
            if (b.id != "colorContainer") {
                a.S[a.i].style.backgroundColor = a.R[a.i].value = b.getAttribute("rgb");
                a.S[a.i].style.zIndex = 1;
                a.o();
                MC.cPC(b.style.backgroundColor, a.i)
            }
            a.f(c)
        },
        m: function() {
            for (var d = document.getElementsByTagName("input"), a = this, c = 0, f = d.length; c < f; c++)
                if (e(d[c].className)) {
                    var b = a.R.length;
                    if (d[c].i === undefined) {
                        a.R[b] = d[c];
                        a.R[b].i = b;
                        a.R[b].onchange = function() {
                            a.n(a.S[this.i], this)
                        };
                        a.S[b] = document.createElement("span");
                        a.S[b].i = b;
                        a.S[b].className = "colorChooser";
                        a.R[b].parentNode.insertBefore(a.S[b], a.R[b].nextSibling);
                        a.p(a.S[b]);
                        a.n(a.S[b], a.R[b])
                    }
                }
        },
        n: function(b, a) {
            try {
                b.style.backgroundColor = a.value
            } catch (c) {}
        },
        o: function() {
            this.r.style.display = "none"
        },
        p: function(c) {
            var a = this;
            b(c, "click", function(b) {
                if (a.i > -1) a.S[a.i].style.zIndex = 1;
                a.i = c.i;
                c.appendChild(a.r).style.display = "block";
                a.S[a.i].style.zIndex = 2;
                a.f(b)
            })
        }
    };
    var c = function() {
            if (!a) a = new d
        },
        f = function(d) {
            var a = false;

            function c() {
                if (a) return;
                a = true;
                setTimeout(function () {d();}, 4)
            }
            document.addEventListener && document.addEventListener("DOMContentLoaded", c, false);
            b(window, "load", c)
        };
    MC.cpInitOnDomReady && f(c);
    return {
        refresh: function() {
            for (var b = 0, c = a.R.length; b < c; b++) a.n(a.S[b], a.R[b])
        },
        reload: function() {
            a.m()
        },
        init: c
    }
}()
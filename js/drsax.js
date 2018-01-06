
//  The MIT License (MIT)
//  Copyright (c) 2016  Euyshick Hong(Dr.Hong)

//  Permission is hereby granted, free of charge, to any person obtaining a copy
//  of this software and associated documentation files (the "Software"), to deal
///  in the Software without restriction, including without limitation the rights
//  to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
//  copies of the Software, and to permit persons to whom the Software is
//  furnished to do so, subject to the following conditions:
//  The above copyright notice and this permission notice shall be included in all
//  copies or substantial portions of the Software.
//  THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
//  IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
//  FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
//  AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
//  LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
//  OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
//  SOFTWARE.


(function(window) {

    var drsaxContext,
        drsaxInstance;

    var Super = Object.create(null, {
            activate: {
                writable: true,
                value: function(doActivate) {
                    if (doActivate) {
                        this.input.disconnect();
                        this.input.connect(this.activateNode);
                        if (this.activateCallback) {
                            this.activateCallback(doActivate);
                        }
                    } else {
                        this.input.disconnect();
                        this.input.connect(this.output);
                    }
                }
            },
            bypass: {
                get: function() {
                    return this._bypass;
                },
                set: function(value) {
                    if (this._lastBypassValue === value) {
                        return;
                    }
                    this._bypass = value;
                    this.activate(!value);
                    this._lastBypassValue = value;
                }
            },
            connect: {
                value: function(target) {
                    this.output.connect(target);
                }
            },
            disconnect: {
                value: function(target) {
                    this.output.disconnect(target);
                }
            },

            getDefaults: {
                value: function() {
                    var result = {};
                    for (var key in this.defaults) {
                        result[key] = this.defaults[key].value;
                    }
                    return result;
                }
            }
        });

        OscObject = Object.create(null, {

        });


        var FLOAT = "float",
            BOOLEAN = "boolean",
            STRING = "string",
            INT = "int";

    /*
    *  Object and AudioContext
    */

    var root = this;

    var AudioContext = root.AudioContext;
    drsax = new AudioContext();

    if (typeof module !== "undefined" && module.exports) {
        module.exports = DSX;
    } else {
        window.DSX = DSX;
    }


    function DSX() {

        if(!(this instanceof DSX)){
            return new DSX();
        }
        connectify(drsax);
        drsaxContext = drsax;
        drsaxInstance = this;
    }


    /////////////////////////////////////////////////////////////////


    function connectify(sax) {

        if (sax.__connectified__ === true) return;
        var gain = sax.createGain(),
            proto = Object.getPrototypeOf(Object.getPrototypeOf(gain)),
            oconnect = proto.connect;

        proto.connect = shimConnect;
        sax.__connectified__ = true; // Prevent overriding connect more than once

        function shimConnect() {
            var node = arguments[0];
            arguments[0] = Super.isPrototypeOf? (Super.isPrototypeOf(node) ? node.input : node) : (node.input || node);
            oconnect.apply(this, arguments);
            return node;
        }
    }



    function initValue(userVal, defaultVal) {
        return userVal === undefined ? defaultVal : userVal;
    }


    // Delay

    DSX.prototype.Delay = function(properties) {
        if (!properties) {
            properties = this.getDefaults();
        }
        this.input = drsaxContext.createGain();
        this.activateNode = drsaxContext.createGain();

        this.delay = drsaxContext.createDelay();
        this.feedbackNode = drsaxContext.createGain();
        this.output = drsaxContext.createGain();

        this.activateNode.connect(this.delay);
        this.delay.connect(this.feedbackNode);
        this.feedbackNode.connect(this.delay);
        this.delay.connect(this.output);

        this.delayTime = properties.delayTime || this.defaults.delayTime.value;
        this.feedback = initValue(properties.feedback, this.defaults.feedback.value);
        this.bypass = properties.bypass || false;
    };

    DSX.prototype.Delay.prototype = Object.create(Super, {
        name: {
            value: "Delay"
        },
        defaults: {
            writable: true,
            value: {
                delayTime: {
                    value: 1,
                    min: 0,
                    max: 1,
                    automatable: false,
                    type: FLOAT
                },
                feedback: {
                    value: 0.45,
                    min: 0,
                    max: 0.9,
                    automatable: true,
                    type: FLOAT
                },
            }
        },
        delayTime: {

            enumerable: true,
            get: function() {
                return this.delay.delayTime;
            },
            set: function(value) {
                this.delay.delayTime.value = value / 1000;
            }
        },

        feedback: {

            enumerable: true,
            get: function() {
                return this.feedbackNode.gain;
            },
            set: function(value) {
                this.feedbackNode.gain.value = value;
            }
        }
    });


    //stereo panning

    DSX.prototype.stereoPan = function(properties) {
        if (!properties) {
            properties = this.getDefaults();
        }
        this.input = drsaxContext.createGain();
        this.activateNode = drsaxContext.createGain();
        this.stereoPan = drsaxContext.createStereoPanner();
        this.output = drsaxContext.createGain();

        this.activateNode.connect(this.stereoPan);
        this.stereoPan.connect(this.output);


        this.pan = properties.pan || this.defaults.pan.value;
        this.bypass = properties.bypass || false;
    };
    DSX.prototype.stereoPan.prototype = Object.create(Super, {
        name: {
            value: "stereoPan"
        },
        defaults: {
            writable: true,
            value: {
                pan:{
                    value: 0,
                    min: -1,
                    max: 1,
                    automatable: false,
                    type: FLOAT
                },

            }
        },


        pan: {
            enumerable: true,
            get: function(){
                return this.stereoPan.pan;
            },
            set: function(value) {
                this.stereoPan.pan.value = value;
            }
        }
    });


    // saxComp

    DSX.prototype.saxComp = function(properties) {
        if (!properties) {
            properties = this.getDefaults();
        }
        this.input = drsaxContext.createGain();
        this.activateNode = drsaxContext.createGain();

        this.saxComp = drsaxContext.createDynamicsCompressor();
        this.output = drsaxContext.createGain();

        this.activateNode.connect(this.saxComp);
        this.saxComp.connect(this.output);

        this.threshold = properties.threshold || this.defaults.threshold.value;
        this.knee = properties.knee || this.defaults.knee.value;
        this.ratio = properties.ratio || this.defaults.ratio.value;
        this.reduction = properties.reduction || this.defaults.reduction.value;
        this.attack = properties.attack || this.defaults.attack.value;
        this.release = properties.release || this.defaults.release.value;
        this.bypass = properties.bypass || false;
    };
    DSX.prototype.saxComp.prototype = Object.create(Super, {
        name: {
            value: "saxComp"
        },
        defaults: {
            writable: true,
            value: {
                threshold: {
                    value: -70,
                    min: -100,
                    max: 0,
                    automatable: false,
                    type: FLOAT
                },
                knee: {
                    value: 40,
                    min: 0,
                    max: 100,
                    automatable: true,
                    type: FLOAT
                },

                ratio: {
                    value: 12,
                    min: 0,
                    max: 15,
                    automatable: true,
                    type: FLOAT
                },
                reduction: {
                    value: -20,
                    min: -40,
                    max: 0,
                    automatable: true,
                    type: FLOAT
                },

                attack: {
                    value: 0,
                    min: 0,
                    max: 5,
                    automatable: true,
                    type: FLOAT
                },

                release: {
                    value: 0.25,
                    min: 0,
                    max: 0.5,
                    automatable: true,
                    type: FLOAT
                },

            }
        },
        threshold: {
            enumerable: true,
            get: function() {
                return this.saxComp.threshold;
            },
            set: function(value) {
                this.saxComp.threshold.value = value;
            }
        },

        knee: {
            enumerable: true,
            get: function() {
                return this.saxComp.knee;
            },
            set: function(value) {
                this.saxComp.knee.value = value;
            }
        },
        ratio: {
            enumerable: true,
            get: function() {
                return this.saxComp.ratio;
            },
            set: function(value) {
                this.saxComp.ratio.value = value;
            }
        },
        reduction: {
            enumerable: true,
            get: function() {
                return this.saxComp.reduction;
            },
            set: function(value) {
                this.saxComp.reduction.value = value;
            }
        },
        attack: {
            enumerable: true,
            get: function() {
                return this.saxComp.attack;
            },
            set: function(value) {
                this.saxComp.attack.value = value;
            }
        },
        release: {
            enumerable: true,
            get: function() {
                return this.saxComp.release;
            },
            set: function(value) {
                this.saxComp.release.value = value;
            }
        }
    });




    // 5 EQ

    DSX.prototype.EQ = function(properties) {

        if (!properties) {
            properties = this.getDefaults();
        }
        this.input = drsaxContext.createGain();
        this.activateNode = drsaxContext.createGain();

        this.high = drsaxContext.createBiquadFilter();
        this.midhigh = drsaxContext.createBiquadFilter();
        this.mid = drsaxContext.createBiquadFilter();
        this.midlow = drsaxContext.createBiquadFilter();
        this.low = drsaxContext.createBiquadFilter();

        this.output = drsaxContext.createGain();

        this.activateNode.connect(this.high);
        this.high.connect(this.midhigh);
        this.midhigh.connect(this.mid);
        this.mid.connect(this.midlow);
        this.midlow.connect(this.low);
        this.low.connect(this.output);

        this.high.type = "highshelf";
        this.midhigh.type = "highshelf";
        this.mid.type = "peaking";
        this.midlow.type = "lowshelf";
        this.low.type = "lowshelf";
        this.high.frequency.value = 13000;
        this.midhigh.frequency.value = 4000;
        this.mid.frequency.value = 1000;
        this.midlow.frequency.value = 250;
        this.low.frequency.value = 62.5;
        this.mid.Q.value = 1;

        this.hiGain = properties.hiGain || this.defaults.hiGain.value;
        this.mhiGain = properties.mhiGain || this.defaults.mhiGain.value;
        this.miGain = properties.miGain || this.defaults.miGain.value;
        this.milowGain = properties.milowGain || this.defaults.milowGain.value;
        this.lowGain = properties.lowGain || this.defaults.lowGain.value;

        this.bypass = properties.bypass || false;


    };

    DSX.prototype.EQ.prototype = Object.create(Super, {
        name: {
            value: "EQ"
        },
        defaults: {
            writable: true,
            value: {

                hiGain: {
                    value: -10,
                    min: -20,
                    max: 20,
                    automatable: false,
                    type: FLOAT
                },

                mhiGain: {
                    value: -10,
                    min: -20,
                    max: 20,
                    automatable: false,
                    type: FLOAT
                },

                miGain: {
                    value: -10,
                    min: -20,
                    max: 20,
                    automatable: false,
                    type: FLOAT
                },

                milowGain: {
                    value: -10,
                    min: -20,
                    max: 20,
                    automatable: false,
                    type: FLOAT
                },

                lowGain: {
                    value: -10,
                    min: -20,
                    max: 20,
                    automatable: false,
                    type: FLOAT
                }

            }
        },

        hiGain: {
            enumerable: true,
            get: function() {
                return this.high.gain;
            },
            set: function(value) {
                this.high.gain.value = value;
            }
        },

        mhiGain: {
            enumerable: true,
            get: function() {
                return this.midhigh.gain;
            },
            set: function(value) {
                this.midhigh.gain.value = value;
            }
        },

        miGain: {
            enumerable: true,
            get: function() {
                return this.mid.gain;
            },
            set: function(value) {
                this.mid.gain.value = value;
            }
        },

        milowGain: {
            enumerable: true,
            get: function() {
                return this.midlow.gain;
            },
            set: function(value) {
                this.midlow.gain.value = value;
            }
        },

        lowGain: {
            enumerable: true,
            get: function() {
                return this.low.gain;
            },
            set: function(value) {
                this.low.gain.value = value;
            }
        }


    });

    // Amp

    DSX.prototype.Amp = function(properties) {
        if (!properties) {
            properties = this.getDefaults();
        }
        this.input = drsaxContext.createGain();
        this.activateNode = drsaxContext.createGain();

        this.Amp = drsaxContext.createGain();
        this.output = drsaxContext.createGain();

        this.activateNode.connect(this.Amp);
        this.Amp.connect(this.output);

        this.gain = properties.gain || this.defaults.gain.value;
        this.bypass = properties.bypass || false;
    };

    DSX.prototype.Amp.prototype = Object.create(Super, {
        name: {
            value: "Amp"
        },
        defaults: {
            writable: true,
            value: {
                gain: {
                    value: 0,
                    min: 0,
                    max: 1,
                    automatable: false,
                    type: FLOAT
                },
            }
        },
        gain: {
            enumerable: true,
            get: function() {
                return this.Amp.gain;
            },
            set: function(value) {
                this.Amp.gain.value = value;
            }
        }


    });

    // Aux

    DSX.prototype.Aux = function(properties) {
        if (!properties) {
            properties = this.getDefaults();
        }
        this.input = drsaxContext.createGain();
        this.activateNode = drsaxContext.createGain();

        this.Aux = drsaxContext.createGain();
        this.output = drsaxContext.createGain();

        this.activateNode.connect(this.Aux);
        this.Aux.connect(this.output);

        this.gain = properties.gain || this.defaults.gain.value;
        this.bypass = properties.bypass || false;
    };

    DSX.prototype.Aux.prototype = Object.create(Super, {
        name: {
            value: "Aux"
        },
        defaults: {
            writable: true,
            value: {
                gain: {
                    value: 0,
                    min: 0,
                    max: 1,
                    automatable: false,
                    type: FLOAT
                },
            }
        },

        gain: {
            enumerable: true,
            get: function() {
                return this.Aux.gain;
            },
            set: function(value) {
                this.Aux.gain.value = value;
            }
        }
    });

    //Analyser

    DSX.prototype.Analyser = function(properties) {
        if (!properties) {
            properties = this.getDefaults();
        }
        this.input = drsaxContext.createGain();
        this.activateNode = drsaxContext.createGain();

        this.Analyser = drsaxContext.createAnalyser();
        this.output = drsaxContext.createGain();

        this.activateNode.connect(this.Analyser);
        this.Analyser.connect(this.output);

        this.fftsize = properties.fftsize || this.defaults.fftsize;
        this.bypass = properties.bypass || false;

    };

    DSX.prototype.Analyser.prototype = Object.create(Super, {
        name: {
            value: "Analyser"
        },
        defaults: {
            writable: true,
            value: {
                fftsize: {
                    value: 2048,
                    min: 0,
                    max: 10000,
                    automatable: false,
                    type: FLOAT
                },
            }
        },
        fftsize: {
            enumerable: true,
            get: function() {
                return this.Analyser.fftsize;
            },
            set: function(value) {
                this.Analyser.fftsize = value;
            }
        }


    });

    // Osc

    DSX.prototype.Osc = function(properties) {

        this.drOsc = drsax.createOscillator();
        this.gain_out = drsax.createGain();

        this.frequency = this.drOsc.frequency; // simple datachange
        this.wave = this.drOsc;               // simple datachange
        this.detune = this.drOsc.detune;       // simple datachange
        this.drOsc.start(0);

        this.connect = function(out) {

            this.out = out;
            this.gain_out.connect(out);
        };

        this.start = function() {
            this.drOsc.connect(this.gain_out);
        };

        this.stop = function() {
            this.drOsc.disconnect(this.gain_out);
        };

        this.type = properties.type;
        this.freq = properties.freq;
    };

    DSX.prototype.Osc.prototype = Object.create(OscObject, {

       type: {
                enumerable: true,
                get: function() {
                    return this.drOsc;
                },
                set: function(value) {
                     this.drOsc.type= value;
                }
            },

            freq: {
                enumerable: true,
                get: function() {
                    return this.drOsc.frequency;
                },
                set: function(value) {
                     this.drOsc.frequency.value= value;
                }
            }
    });


    // AM


    DSX.prototype.AM = function(properties) {

        this.AMOsc = drsax.createOscillator();
        this.gain1 = drsax.createGain();
        this.mainout = drsax.createGain();
        this.depth_gain = drsax.createGain();

        this.AMOsc.connect(this.gain1);
        this.gain1.connect(this.mainout.gain);
        this.depth_gain.connect(this.mainout.gain);

        this.AMOsc.start(0);

        this.get = function(dat) {

            this.dat = dat;
            this.dat.connect(this.mainout);

        };

        this.connect = function(out) {
            this.out = out;
            this.mainout.connect(out);
        };
        this.stop = function() {
            this.mainout.disconnect();
        };

          this.modfreq =properties. modfreq;
          this.mod_type = properties.mod_type;
          this.depth =properties.depth;
          this.gain =properties.gain;

    };



    DSX.prototype.AM.prototype = Object.create(OscObject, {

        mod_type: {
                enumerable: true,
                get: function() {
                    return this.AMOsc;
                },
                set: function(value) {
                     this.AMOsc.type= value;
                }
            },

        modfreq: {
            enumerable: true,
            get: function() {
                return this.AMOsc.frequency;
            },
            set: function(value) {
                 this.AMOsc.frequency.value= value;
            }
        },

        depth: {
            enumerable: true,
            get: function() {
                return this.gain1.gain;
            },
            set: function(value) {
                 this.gain1.gain.value= value;
            }
        },


       gain: {
                enumerable: true,
                get: function() {
                    return this.mainout.gain;
                },
                set: function(value) {
                     this.mainout.gain.value= value;
                }
        }

    });



    // FM

    DSX.prototype.FM = function(properties) {

        this.CAOsc = drsax.createOscillator();
        this.FMOsc = drsax.createOscillator();

        this.gain1 = drsax.createGain();
        this.mainout = drsax.createGain();

        this.CAOsc.connect(this.mainout);
        this.FMOsc.connect(this.gain1);
        this.gain1.connect(this.CAOsc.frequency);

        this.FMOsc.start(0);
        this.CAOsc.start(0);

        this.connect = function(out) {
            this.out = out;
            this.mainout.connect(out);
        };


        this.stop = function() {
            this.mainout.disconnect();
        };

        this.carrier_type =properties.carrier_type;
        this.carrier = properties.carrier;
        this.modfreq =properties. modfreq;
        this.mod_type = properties.mod_type;
        this.depth =properties.depth;
        this.gain =properties.gain;
    };



    DSX.prototype.FM.prototype = Object.create(OscObject, {

        carrier_type: {
            enumerable: true,
            get: function() {
                return this.CAOsc;
            },
            set: function(value) {
                 this.CAOsc.type= value;
            }
        },

        carrier: {
            enumerable: true,
            get: function() {
                return this.CAOsc.frequency;
            },
            set: function(value) {
                 this.CAOsc.frequency.value= value;
            }
        },

        mod_type: {
            enumerable: true,
            get: function() {
                return this.FMOsc;
            },
            set: function(value) {
                 this.FMOsc.type= value;
            }
        },

        modfreq: {
            enumerable: true,
            get: function() {
                return this.FMOsc.frequency;
            },
            set: function(value) {
                 this.FMOsc.frequency.value= value;
            }
        },

        depth: {
            enumerable: true,
            get: function() {
                return this.gain1.gain;
            },
            set: function(value) {
                 this.gain1.gain.value= value;
            }
        },

       gain: {
                enumerable: true,
                get: function() {
                    return this.mainout.gain;
                },
                set: function(value) {
                     this.mainout.gain.value= value;
                }
            }
    });



    //Subtract

    DSX.prototype.Subtract = function(properties) {

        if (!properties) {
            properties = this.getDefaults();
        }
        this.input = drsaxContext.createGain();
        this.activateNode = drsaxContext.createGain();
        this.Lowpass = drsax.createBiquadFilter();
        this.output = drsaxContext.createGain();

        this.activateNode.connect(this.Lowpass);
        this.Lowpass.connect(this.output);

        this.cutoff = properties.cutoff || this.defaults.cutoff.value;
        this.resonance = properties.resonance || this.defaults.resonance.value;
        this.gain = properties.gain || this.defaults.gain.value;
        this.bypass = properties.bypass || false;
    };

    DSX.prototype.Subtract.prototype = Object.create(Super, {
        name: {
            value: "Subtract"
        },
        defaults: {
            writable: true,
            value: {
                cutoff: {
                    value: 1000,
                    min: 0,
                    max: 2000,
                    automatable: false,
                    type: FLOAT
                },

                resonance: {
                    value: 0,
                    min: 0,
                    max: 20,
                    automatable: false,
                    type: FLOAT
                },

                gain: {
                    value: 0.8,
                    min: 0,
                    max: 1,
                    automatable: false,
                    type: FLOAT
                },

            }
        },

        cutoff: {
            enumerable: true,
            get: function() {
                return this.Lowpass.frequency;
            },
            set: function(value) {
                this.Lowpass.frequency.value = value;
            }
        },
        resonance: {
            enumerable: true,
            get: function() {
                return this.Lowpass.Q;
            },
            set: function(value) {
                this.Lowpass.Q.value = value;
            }
        },
        gain: {
            enumerable: true,
            get: function() {
                return this.output.gain;
            },
            set: function(value) {
                this.output.gain.value = value;
            }
        }
    });

    /////// BGsound /////////////////////////////////

    DSX.prototype.BGsound = function(out) {

        this.speed = 1;
        this.out =out;

        var uploadfile;
        var getFile_sound = new XMLHttpRequest();
        getFile_sound.open("GET", "", true);
        getFile_sound.responseType = "arraybuffer";
        getFile_sound.send();
        var sound_reader = new FileReader();
        var fileI = document.getElementById(out);

        fileI.addEventListener('change', function() {
            sound_reader.onload = function() {
                drsax.decodeAudioData(this.result, function(buffer) {
                    uploadfile = buffer;
                });
            };
            sound_reader.readAsArrayBuffer(this.files[0]);
        }, false);

        this.connect = function(out) {

            this.BG = drsax.createBufferSource();
            this.out = out;
            this.BG.connect(out);
            this.BG.start(0);
            this.BG.buffer = uploadfile;
            this.data =this.BG.playbackRate;
            this.data.value = this.speed;

            this.stop = function() {
                this.BG.stop(0);
            };
        };
    };



    // Reverb
    DSX.prototype.Reverb = function(properties) {

        this.reverb_Gain = drsax.createGain();
        this.reverb_convolver = drsax.createConvolver();
        this.masterGain = drsax.createGain();
        //this.gain = this.reverb_Gain.gain; ///////simple datachange
        this.reverb_convolver.loop = false;
        this.reverb_convolver.normalize = true;

        var reverbfile;
        var revebRequest = new XMLHttpRequest();
        revebRequest.open('GET', 'https://drsax.github.io/DrSAX/DrSAX/reverbbg.wav', true);
        revebRequest.responseType = 'arraybuffer';
        revebRequest.send();

        revebRequest.onload = function() {

            var impulseData = revebRequest.response;
            drsax.decodeAudioData(impulseData, function(buffer) {
                    reverbfile = buffer;
                },
                function(e) {
                    console.log("Error with decoding audio data" + e.err);
                });
        };


        this.connect = function(out) {

            this.out = out;
            this.reverb_Gain.connect(this.reverb_convolver);
            this.reverb_convolver.connect(this.masterGain);
            this.masterGain.connect(out);
        };

        this.disconnect = function() {
            this.reverb_convolver.disconnect(this.masterGain);
            this.masterGain.disconnect(0);
        };

        this.getfrom = function(dat) {
            this.dat = dat;
            this.reverb_convolver.buffer = reverbfile;
            this.dat.connect(this.reverb_Gain);
            this.dat.connect(this.masterGain);

        };

        this.gain = properties.gain;
    };

    DSX.prototype.Reverb.prototype = Object.create(OscObject, {

        gain: {
            enumerable: true,
            get: function() {
                return this.reverb_Gain.gain;
            },
            set: function(value) {
                 this.reverb_Gain.gain.value= value;
            }
        }
    });

    // Mic

    DSX.prototype.Mic = function() {

        navigator.webkitGetUserMedia({
            audio: true
        }, mic_stream, mic_null);

        function mic_stream(stream) {
            this.stream = stream;
            this.saxInput = drsax.createMediaStreamSource(stream);
        }

        function mic_null() {
        }

        this.connect = function(out) {
            this.out = out;
            this.saxInput.connect(out);

        };

    };


    // dialInput

    DSX.prototype.valueChange = function(c, b) {

        this.c = c;
        this.b = b;
        this.dial_10 = document.getElementById(c);
        this.dial_10.addEventListener("change", _dial10, false);

        function _dial10(e) {
            b.value = e.target.value;
        }

        this.setRange = function(out) {
            this.out = out;
            this.dial_10.addEventListener("change", out, false);

        };
    };

    DSX.prototype.functionChange = function(c,out) {

        this.c = c;
        this.out = out;
        this.dial_10 = document.getElementById(c);
        this.dial_10.addEventListener("change", out, false);
    };

    DSX.prototype.valueToggle = function(c,out) {

        this.c = c;
        this.out = out;
        this.dial_10 = document.getElementById(c);
        this.dial_10.addEventListener("click", out, false);

    };

    // freqDomain

    DSX.prototype.freqDomain = function(out,color) {

        this.out = out;
        this.color =color;

        var Analyser_CANVAS = drsax.createAnalyser();

        this.getAnalyser = function(out) {

            this.out = out;
            this.out.connect(Analyser_CANVAS);

        };

        var canvas1 = document.getElementById(out);
        var ctx_frequency = canvas1.getContext('2d');
        frameLooper();

        function frameLooper() {
            window.requestAnimationFrame(frameLooper);
            fbc_array = new Uint8Array(Analyser_CANVAS.frequencyBinCount);
            Analyser_CANVAS.getByteFrequencyData(fbc_array);
            ctx_frequency.clearRect(0, 0, canvas1.width, canvas1.height); // Clear the canvas
            ctx_frequency.fillStyle = color; // Color of the bars
            bars = 100;
            for (var i = 0; i < bars; i++) {
                bar_x = i * 3;
                bar_width = 2;
                bar_height = -(fbc_array[i] / 2);
                //  fillRect( x, y, width, height ) // Explanation of the parameters below
                ctx_frequency.fillRect(bar_x, canvas1.height, bar_width, bar_height);
            }
        }
    };



    // ampDomain
    DSX.prototype.ampDomain = function(out, color , fix, seconds) {

        this.out = out;
        this.color =color;
        var Analyser_CANVAS1 = drsax.createAnalyser();

        this.getAnalyser = function(out) {
            this.out = out;
            this.out.connect(Analyser_CANVAS1);
           clearInterval(ampDomain_data);
        };


        var ampDomain_data;
        var column = 0;
        // this.canvasWidth  = canvasWidth;
        // this.canvasHeight = canvasHeight;

        var canvas2 = document.getElementById(out);
        var ctx_amp = canvas2.getContext('2d');
        frameLooperAmp();


        function frameLooperAmp() {

            window.requestAnimationFrame(frameLooperAmp);
            amplitudeArray = new Uint8Array(Analyser_CANVAS1.frequencyBinCount);

            Analyser_CANVAS1.getByteTimeDomainData(amplitudeArray);

            var minValue = 9999999;
            var maxValue = 0;

            for (var i = 0; i < amplitudeArray.length; i++) {
                //console.log(amplitudeArray);
                var value = amplitudeArray[i] / 256;
                //console.log(value);
                if(value > maxValue) {

                    maxValue = value;     //maxValue: 0.5

                } else if(value < minValue) {
                    minValue = value;  //minalue: 0.5
                }
            }
            var canvasHeight = canvas2.height;
            var canvasWidth = canvas2.width;
            //console.log("min",minValue );
            //console.log(canvasHeight);
            //console.log(canvasWidth);
            //maxValue: 0.5
            //console.log(minValue);
            //console.log(maxValue);
            if ( maxValue > 0.5  ){
                    column += 1;
            }
            //console.log(column);
            var y_lo = canvasHeight - (canvasHeight * minValue); //- 1;
            var y_hi = canvasHeight - (canvasHeight * maxValue);// - 1;

            ctx_amp.fillStyle = color;

            var timeData = canvasWidth/seconds|| 5;
            console.log(timeData);



            if (fix !== "fix"){


                ctx_amp.fillRect(column ,y_lo, 1, y_hi - y_lo); //ctx_amp.fillRect(column,y_lo, 0.1, y_hi - y_lo);

            } else {

                ctx_amp.fillRect(column/5 ,y_lo, 1, y_hi - y_lo); //ctx_amp.fillRect(column,y_lo, 0.1, y_hi - y_lo);
            }

            // loop around the canvas when we reach the end


            if (fix !== "fix"){

                if(column >= canvasWidth) {
                    column = 0;
                    ctx_amp.clearRect(0, 0, canvasWidth, canvasHeight);

                }
            }
        }

        this.cutAnalyser = function() {

            ampDomain_data = setInterval(function() {
                column = 0;
            }, 10);
            column = 0;
            ctx_amp.clearRect(0, 0, canvasWidth, canvasHeight);
        };
    };


    // Tunner
    DSX.prototype.Tunner = function(pit,note) {

        this.pit = pit;
        this.note = note;
        pitchData =this.pitchData;

        var Analyser_Tunner = drsax.createAnalyser();
        this.getAnalyser = function(out) {

            this.out = out;
            this.out.connect(Analyser_Tunner);
            this.updatePitch();
        };





        var detectorElem, canvasElem,  pitchElem, noteElem,fff;
        pitchElem = document.getElementById( pit);
        noteElem = document.getElementById( note);

        var theBuffer = null;
        var rafID = null;
        var tracks = null;
        var buflen = 1024;
        var buf = new Float32Array( buflen );
        var noteStrings = ["C", "Db", "D", "Eb", "E", "F", "F#", "G", "Ab", "A", "Bb", "B"];
        function noteFromPitch( frequency ) {
          var noteNum = 12 * (Math.log( frequency / 440 )/Math.log(2) );
          return Math.round( noteNum ) + 69;
        }
        function frequencyFromNoteNumber( note ) {
          return 440 * Math.pow(2,(note-69)/12);
        }
        function centsOffFromPitch( frequency, note ) {
          return Math.floor( 1200 * Math.log( frequency / frequencyFromNoteNumber( note ))/Math.log(2) );
        }
        var MIN_SAMPLES = 0;

        function autoCorrelate( buf, sampleRate ) {

            var SIZE = buf.length;
            var MAX_SAMPLES = Math.floor(SIZE/2);
            var best_offset = -1;
            var best_correlation = 0;
            var rms = 0;
            var foundGoodCorrelation = false;
            var correlations = new Array(MAX_SAMPLES);


            for (var i=0;i<SIZE;i++) {
                var val = buf[i];
                rms += val*val;
            }
            rms = Math.sqrt(rms/SIZE);


            if (rms<0.01)
                return -1;
            var lastCorrelation=1;

            for (var offset = MIN_SAMPLES; offset < MAX_SAMPLES; offset++) {

                var correlation = 0;
                for (var _i=0; _i<MAX_SAMPLES; _i++) {
                    correlation += Math.abs((buf[_i])-(buf[_i+offset]));
                }
                correlation = 1 - (correlation/MAX_SAMPLES);
                correlations[offset] = correlation;

                if ((correlation>0.9) && (correlation > lastCorrelation)) {
                    foundGoodCorrelation = true;
                    if (correlation > best_correlation) {
                        best_correlation = correlation;
                        best_offset = offset;
                    }
                } else if (foundGoodCorrelation) {

                    var shift = (correlations[best_offset+1] - correlations[best_offset-1])/correlations[best_offset];
                    return sampleRate/(best_offset+(8*shift));
                }
                lastCorrelation = correlation;
            }

            if (best_correlation > 0.01) {

                return sampleRate/best_offset;
            }
            return -1;

        }


        this.updatePitch = function updatePitch() {

            var cycles = [];
            Analyser_Tunner.getFloatTimeDomainData( buf );
            var ac = autoCorrelate( buf, drsaxContext.sampleRate );
            rafID = window.requestAnimationFrame(updatePitch);

            if (ac == -1) {

                pitchElem.innerText = "440";
                noteElem.innerText = "A";

            } else {

                this.pitchData = Math.round(ac);
                pitchElem.innerText = this.pitchData;
                var note =  noteFromPitch(ac);
                noteElem.innerHTML = noteStrings[note%12];
            }
        };

    };
    // music player

    DSX.prototype.musicPlayer = function() {

        window.addEventListener('load', this.load, false);

            this.load = function(out,out_two) {
            this.out = out;
            this.out_two =out_two;

            var fileUp = document.getElementById(out);
            var audioPlay = document.getElementById(out_two);
            fileUp.addEventListener('change', onFile, false);


            function onFile(){

                var reader = new FileReader();
                reader.onload = function (evt){ audioPlay.src = evt.target.result;};
                reader.readAsDataURL(this.files[0]);

            }
        };
    };



    DSX.prototype.ATRS = function() {

        this.gain = drsax.createGain();
        this.gain1= drsax.createGain();
        this.gain2= drsax.createGain();

        this.attack =  this.gain1.gain;
        this.release = this.gain2.gain;

        this.soundfrom = function(sound) {

            this.sound=sound;
            this.sound.connect(this.gain);
            this.now = drsax.currentTime;
            this.gain.gain.cancelScheduledValues(this.now);
            console.log(this.now);
            console.log(this.attack.value);
            console.log(this.release.value);
            this.gain.gain.setValueAtTime(0, this.now);
            this.gain.gain.linearRampToValueAtTime(1, this.now+ 0.01 + this.attack.value ,2);
            this.gain.gain.linearRampToValueAtTime(0 , this.now +2 + this.attack.value + this.release.value,2);
            console.log(this.gain.value);

        };

        this.connect = function(out) {

            this.out = out;
            this.gain.connect(out);

        };

    };

    // BGdata

    DSX.prototype.BGdata = function(file){

        this.file = file;

        var getFile_sound = new XMLHttpRequest();
        getFile_sound.open("GET", file, true);
        getFile_sound.responseType = "arraybuffer";
        getFile_sound.send();

        getFile_sound.onload = function() {
            var audioData = getFile_sound.response;
            drsax.decodeAudioData(audioData, function(buffer) {
                myBuffer = buffer;
            });
        };

        this.BG = drsax.createBufferSource();
        this.speed= this.BG.playbackRate;

        this.connect = function(out) {

            this.out = out;
            this.BG.connect(out);
            this.BG.buffer = myBuffer;

            this.start = function() {
                this.BG.start(0);
            };

            this.stop = function() {
                this.BG.stop();
            };
            //this.playbackRate.value = 1.25;
        };
    };


    DSX.prototype.pitchShift = function(overlapRatio,pitchRatio) {

        this.pitchRatio = pitchRatio;
        this.overlapRatio = overlapRatio;

        hannWindow = function() {

            var window = new Float32Array(512);
            for (var i = 0; i < 512; i++) {
                window[i] = 0.5 * (1 - Math.cos(2 * Math.PI * i / (512 - 1)));
            }
            return window;
        };

        this.pitchShifterProcessor = drsaxContext.createScriptProcessor(512, 1, 1);
        this.pitchShifterProcessor.buffer = new Float32Array(512 * 2);
        this.pitchShifterProcessor.grainWindow = hannWindow();

        this.connect = function(out) {
            this.out = out;
            this.pitchShifterProcessor.connect(out);

        };

        this.get = function(dat) {

            this.dat = dat;
            this.dat.connect(this.pitchShifterProcessor);
        };

        this.pitchShifterProcessor.onaudioprocess = function(event) {

            var inputData = event.inputBuffer.getChannelData(0);
            var outputData = event.outputBuffer.getChannelData(0);

            for (i = 0; i < inputData.length; i++) {
                inputData[i] *= this.grainWindow[i];
                this.buffer[i] = this.buffer[i + 512];
                this.buffer[i + 512] = 0.0;
            }

            var grainData = new Float32Array(512 * 2);
            for (var i = 0, j = 0.0; i < 512; i++, j += pitchRatio) {

                var index = Math.floor(j) % 512;
                var a = inputData[index];
                var b = inputData[(index + 1) % 512];
                grainData[i] += a + (b - a) * (j % 1.0) * this.grainWindow[i];
            }

            for (i = 0; i < 512; i += Math.round(512 * (1 - overlapRatio))) {
                for (j = 0; j <= 512; j++) {
                    this.buffer[i + j] += grainData[j];
                }
            }
            for (i = 0; i < 512; i++) {
                outputData[i] = this.buffer[i];
            }

        };

    };




    // DelayPipe

    DSX.prototype.DelayPipe = function(properties) {
        if (!properties) {
            properties = this.getDefaults();
        }
        this.input = drsaxContext.createGain();
        this.activateNode = drsaxContext.createGain();

        this.Delay = drsax.createDelay(10);
        this.output = drsaxContext.createGain();

        this.activateNode.connect(this.Delay);
        this.Delay.connect(this.output);

        this.delayTime = properties.delayTime|| this.defaults.delayTime.value;
        this.bypass = properties.bypass || false;
    };

    DSX.prototype.DelayPipe.prototype = Object.create(Super, {

        name: {
            value: "DelayPipe"
        },
        defaults: {
            writable: true,
            value: {
                delayTime: {
                    value: 0,
                    min: 0,
                    max: 1,
                    automatable: false,
                    type: FLOAT
                },
            }
        },
        delayTime: {
            enumerable: true,
            get: function() {
                return this.Delay.delayTime;
            },
            set: function(value) {
                this.Delay.delayTime.value = value;
            }
        }
    });


    // Record

   DSX.prototype.Record = function(source,out,cfg) {

        this.out=out;
        var config = cfg || {};
        var bufferLen = config.bufferLen || 4096;
        this.context = source.context;
        this.node = (this.context.createScriptProcessor ||
            this.context.createJavaScriptNode).call(this.context,
            bufferLen, 2, 2);

        var worker = new Worker('record.js');
        worker.postMessage({
            command: 'init',
            config: {
                sampleRate: this.context.sampleRate
            }
        });

        var recording = false,
            currCallback;

        this.node.onaudioprocess = function(e) {
            if (!recording) return;
            worker.postMessage({
                command: 'record',
                buffer: [
                    e.inputBuffer.getChannelData(0),
                    e.inputBuffer.getChannelData(1)
                ]
            });
        };

        this.configure = function(cfg) {

            for (var prop in cfg) {
                if (cfg.hasOwnProperty(prop)) {
                    config[prop] = cfg[prop];
                }
            }
        };

        this.record = function() {
            recording = true;
        };

        this.stop = function() {
            recording = false;
        };

        this.clear = function() {
            worker.postMessage({
                command: 'clear'
            });
        };

        this.getBuffer = function(cb) {
            currCallback = cb || config.callback;
            worker.postMessage({
                command: 'getBuffer'
            });
        };

        this.exportWAV = function(cb, type) {

            currCallback = cb || config.callback;
            type = type || config.type || 'audio/wav';
            if (!currCallback) throw new Error('Callback not set');
            worker.postMessage({
                command: 'exportWAV',
                type: type
            });
        };

        worker.onmessage = function(e) {
            var blob = e.data;
            currCallback(blob);
        };

        source.connect(this.node);
        this.node.connect(out);

        //this should not be necessary
    };

    //  window.Record = Record;

    // DSX.get = function(a, b) {
    //     var sum = a + b;
    //     return sum;
    // };

    DSX.dac = DAC = drsax.destination;

})(window);

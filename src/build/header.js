(function(compendium){
    'use strict';

    // Prepare namespace
    // Global shortcuts
    var u = 'UNKNOWN',
        cpd = {},
        lexer = {},
        factory = {},
        analyser = {},
        detectors = {
            specifics: {}
        },
        dependencies = {},
        // dependency parsing v2
        parser = {},
        inflector = {},
        lexicon = {},
        ngrams = {},
        pos = {
            specifics: {
                beforeBrill: function() {},
                afterBrill: function() {},
                getComposedWordTag: null,
                DEFAULT_TAG: u,
                EMOT_TAG: u,
                SYM_TAG: u,
                NUM_TAG: u,
                PUNC_TAG: u
            }
        },
        iA = Array.isArray,
        config = {
            profile: {
                negative_threshold: -0.3,
                positive_threshold: 0.3,
                amplitude_threshold: 0.3,
                polite_threshold: 0.2,
                dirty_threshold: 0.3
            },
            parser: ['v1', 'v2']
        },

        // Various types
        T_FOREIGN = 'foreign',
        T_INTERROGATIVE = 'interrogative',
        T_EXCLAMATORY = 'exclamatory',
        T_HEADLINE = 'headline',
        T_IMPERATIVE = 'imperative',
        T_APPROVAL = 'approval',
        T_REFUSAL = 'refusal';


    compendium.detect = detectors;
    compendium.dependencies = dependencies;
    compendium.inflector = inflector;
    compendium.compendium = cpd;
    compendium.lexer = lexer;
    compendium.parser = parser;
    compendium.lexicon = lexicon;
    compendium.ngrams = ngrams;
    compendium.factory = factory;
    compendium.pos = pos;
    compendium.config = config;

    function extend(target, object) {
        var k;
        for (k in object) {
            if (object.hasOwnProperty(k)) {
                target[k] = object[k];
            }
        };
    };

    // escape regexp specific chars from a string
    function regexpEscape(str) {
        return str.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, '\\$&');
    }


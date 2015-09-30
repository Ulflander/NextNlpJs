

// Parses the lexicon and augment it using compendium
// Also prepare various fields of compendium: parse brill's rules, suffixes...
(function() {

    var registerNgram = function(ngram, pos, sentiment, condition, blocked) {
            if (!ngrams.hasOwnProperty(ngram[0])) {
                ngrams[ngram[0]] = [];
            }
            var posArray;
            if (typeof pos === 'string') {
                posArray = [];
                ngram.forEach(function(v) {
                    posArray.push(pos);
                })
            } else {
                posArray = pos;
            }
            ngrams[ngram[0]].push({
                blocked: true,
                pos: posArray,
                sentiment: sentiment || 0,
                condition: condition,
                tokens: ngram
            });
        },

        register = function(token, pos, sentiment, condition, blocked) {
            if (token.indexOf(' ') > -1) {
                registerNgram(token.toLowerCase().split(' '), pos, sentiment, condition, blocked);
            } else {
                lexicon[token] = {
                    pos: pos,
                    sentiment: sentiment,
                    condition: condition,
                    blocked: blocked || false
                };
            }
        },

        // Parses a Next lexicon
        parse = function(rawLexicon) {
            var d = Date.now(),
                arr = rawLexicon.split('\t'),
                i, j,
                l,
                lastIndex,
                lastItem,
                blocked,
                tmp,
                pt, // PoS tag
                s, // score
                c, // score pos condition
                m,
                // Lexicon
                result = {},

                // We also keep track of emoticons
                emots = [],
                item,
                token;

            // Parses lexicon
            for (i = 0, l = arr.length; i < l; i ++) {
                item = arr[i].split(' ');
                blocked = false;

                m = item.length - 1;
                pt = m > 0 ? item[1].trim() : '';
                pt = (pt === '-' ? pos.specifics.DEFAULT_TAG : pt);

                lastIndex = pt.length - 1;
                // @TODO: alert; the '-' token is used in fr lexicon to skip
                // some data, make this multilingual!
                if (lastIndex > 0 && pt[lastIndex] === '-') {
                    blocked = true;
                    pt = pt.slice(0, lastIndex);
                }

                token = item[0];
                s = 0;
                c = null;

                lastItem = item[m];

                // Sentiment score with PoS tag condition
                if (lastItem.match(/^[A-Z]{2,}\/[0-9\-]+$/g)) {
                    c = lastItem.split('/')[0];
                    s = lastItem.split('/')[1];
                // Simple int score
                } else if (lastItem.match(/^\-{0,1}[0-4]$/g)) {
                    s = parseInt(lastItem, 10);
                // Simple float score
                } else if (lastItem.match(/^\-{0,1}[0-4]\.[0-9]+$/g)) {
                    s = parseFloat(lastItem);
                }

                if (pt === 'EM' && compendium.punycode.ucs2.decode(token).length > 1) {
                    emots.push(token);
                }

                register(token, pt, s, c, blocked);
            }

            // Loop over compendium content
            // and augment lexicon when possible:
            // works only with objects whose keys are the words
            // and values are either a part of speech tag
            // or an integer (POS tag `CD`)
            for (i in cpd) {
                if (cpd.hasOwnProperty(i) && typeof cpd[i] === 'object' && !iA(cpd[i])) {
                    item = cpd[i];
                    for (l in item) {
                        if (item.hasOwnProperty(l)) {
                            s = 0;
                            // {'word': 'PoS_TAG'}
                            if (typeof item[l] === 'string') {
                                if (lexicon.hasOwnProperty(l)) {
                                    s = lexicon[l].sentiment;
                                }
                                lexicon[l] = {
                                    pos: item[l],
                                    sentiment: s,
                                    condition: null
                                };
                            // {'word': 0}
                            } else if (typeof item[l] === 'number') {
                                lexicon[l] = {
                                    pos: 'CD',
                                    sentiment: s,
                                    value: item[l],
                                    condition: null
                                };
                            }
                        }
                    }
                }
            }


            // Prepopulate lexicon with conjugation of regular verbs
            // Reapply sentiment if base form has a score
            for (i = 0, l = cpd.verbs.length; i < l; i ++, s = 0) {
                item = cpd.verbs[i];
                if (!item) {
                    continue;
                }
                cpd.infinitives.push(item);

                tmp = inflector.conjugate(item, 'VBZ');
                if (!tmp) {
                    continue;
                }
                if (lexicon.hasOwnProperty(item)) {
                    if (lexicon[item].pos === 'NN') {
                        lexicon[item].pos = 'VB';
                    }
                    blocked = lexicon[item].blocked;
                    s = lexicon[item].sentiment;
                }

                lexicon[tmp] = {
                    pos: 'VBZ',
                    sentiment: s,
                    condition: null,
                    infinitive: item,
                    blocked: blocked
                };

                tmp = inflector.conjugate(item, 'VBN');
                if (!lexicon.hasOwnProperty(tmp)) {
                    lexicon[tmp] = {
                        pos: 'VBN',
                        sentiment: s,
                        condition: null,
                        infinitive: item
                    };
                } else {
                    lexicon[tmp].infinitive = item;
                }

                tmp = inflector.conjugate(item, 'VBG');
                if (!lexicon.hasOwnProperty(tmp)) {
                    lexicon[tmp] = {
                        pos: 'VBG',
                        sentiment: s,
                        condition: null,
                        infinitive: item
                    };
                } else {
                    lexicon[tmp].infinitive = item;
                }
            }

            // Prepopulate lexicon with irregular verbs
            for (i = 0, l = cpd.irregular.length; i < l; i ++, s = 0) {
                item = cpd.irregular[i];
                m = item[0];
                if (!m) {
                    continue;
                }
                if (lexicon.hasOwnProperty(m)) {
                    s = lexicon[m].sentiment;
                    if (lexicon[m].pos !== 'VB') {
                        lexicon[m].pos = 'VB';
                    }
                }
                cpd.infinitives.push(m);

                for (j = 0; j < 5; j ++) {
                    item[j].split('/').map(function(o) {
                        if (!lexicon.hasOwnProperty(o)) {
                            lexicon[o] = {
                                pos: j === 0 ? 'VB' : j === 1 ? 'VBD' : j === 2 ? 'VBN' : j === 3 ? 'VBZ' : 'VBG',
                                sentiment: s,
                                condition: null,
                                infinitive: m
                            }
                        } else if (!lexicon[o].infinitive) {
                            lexicon[o].infinitive = m;
                            lexicon[o].sentiment = s;
                        }
                    });
                }
            }


            // Register emoticons in compendium for further use by lexer
            cpd.emots = emots;
        },

        // Parses Brill's condition
        brills = function(raw) {
            raw = raw.split('\t');
            var line,
                result = [],
                secondRun,
                i,
                l = raw.length;

            for (i = 0; i < l; i ++) {
                line = raw[i].split(' ');
                if (line[line.length - 1] === '+') {
                    line.splice(line.length - 1, 1);
                    secondRun = true;
                } else {
                    secondRun = false;
                }
                result.push({
                    from: line[0],
                    to: line[1],
                    type: parseInt(line[2], 10),
                    c1: line[3],
                    c2: line[4],
                    c3: line[5],
                    secondRun: secondRun
                });
            }
            cpd.rules = result;
        },

        // Parse compendium suffixes
        suffixes = function(raw) {
            raw = raw.split('\t');
            var i, l = raw.length, result = [], line;

            for (i = 0; i < l; i ++) {
                line = raw[i].split(' ');
                result.push({
                    regexp: new RegExp('^.{1,}' + line[0].trim() + '$', 'gi'),
                    pos: line[1]
                });
            }
            cpd.suffixes = result;
        },

        // Pluralized dirty words
        dirty = function(raw) {
            var i, l = raw.length;

            for (i = 0; i < l; i ++) {
                raw.push(inflector.pluralize(raw[i]));
            }
        },

        // Take care of abbreviations
        abbrs = function(arr) {
            var i, l = arr.length, res = [], rplt = [];
            for (i = 0; i < l; i ++) {
                if (i % 2 === 0) {
                    res.push(arr[i]);
                } else {
                    rplt.push(arr[i]);
                }
            }
            cpd.abbrs = res;
            cpd.abbrs_rplt = rplt;
        },

        demonyms = function(raw) {
            var i, l, res = {};
            raw = raw.split(' ');
            for (i = 0, l = raw.length; i < l; i ++) {
                res[raw[i]] = 'JJ';
            }
            cpd.demonyms = res;
        },

        synonyms = function(raw) {
            raw = raw.split('\t');
            var i, l = raw.length, result = [];
            for (i = 0; i < l; i ++) {
                result.push(raw[i].split(' '));
            }
            cpd.synonyms = result;
        };

    brills(cpd.rules);
    suffixes(cpd.suffixes);
    abbrs(cpd.abbrs);
    dirty(cpd.dirty);
    synonyms(cpd.synonyms);
    demonyms(cpd.demonyms);


    extend(compendium, {
        register: register
    });
    parse("@@lexicon");

}());

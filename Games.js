import path from "path";
import * as url from 'url';

const __dirname = url.fileURLToPath(new URL('.', import.meta.url));
const PATH_MEDIAS = path.join(__dirname, "medias");

export async function init() {
    if (Avatar.static && typeof Avatar.static.set === 'function') {
        Avatar.static.set(PATH_MEDIAS);
    }

	if (!await Avatar.lang.addPluginPak('Games')) {
    return error('Games: unable to load language pak files');
  }
}

export async function action(data, callback) {
    try {

		const Locale = await Avatar.lang.getPak('Games', data.language);
		if (!Locale) {
			throw new Error(`jarvis: Unable to find the '${data.language}' language pak.`);
		
		}
        const client = data.client;
        const toClient = data.toClient || data.client;

        const tblActions = {
            jeuxcarte: () => jeuxcarte(client, toClient, Locale),
            jeux1de: () => jeux1de(client, toClient, Locale),
            jeux2de: () => jeux2de(client, toClient, Locale),
            jeuxpileface: () => jeuxpileface(client, toClient, Locale),
            blackjack: () => blackjack(client, Locale)
        };
        
        info("Games:", data.action.command, "from", client, "to", toClient);
            
        if (tblActions[data.action.command]) {
            await tblActions[data.action.command]();
        }

    } catch (err) {
        if (data.client) Avatar.Speech.end(data.client);
        if (err.message) error(err.message);
    } finally {
        callback();
    }
}

const getAudioUrl = (fileName) => {
    const serverIp = Config.http.ip;
    const serverPort = Config.http.port;
    return `http://${serverIp}:${serverPort}/${encodeURIComponent(fileName)}`;
};

const jeuxcarte = async (client, toClient, Locale) => {
    const valeur = ["le 2", "le 3", "le 4", "le 5", "le 6", "le 7", "le 8", "le 9", "le 10", "le valet", "la dame", "le roi", "l'asse"];
    const couleur = ["coeur", "carreau", "trèfle", "pique"];
    const tts_valeur = valeur[Math.floor(Math.random() * valeur.length)];
    const tts_couleur = couleur[Math.floor(Math.random() * couleur.length)];
    const soundUrl = getAudioUrl("carte.mp3");

	 info("URL :", soundUrl);
    
    Avatar.play(soundUrl, toClient, "url", "after", () => {
        const texte = Locale.get(["speech.choise", tts_valeur, tts_couleur]);
        info(texte);
        Avatar.speak(texte, client);
    });
};

const jeux1de = async (client, toClient, Locale) => {
    const valeur = ["1", "2", "3", "4", "5", "6"];
    const tts_valeur = valeur[Math.floor(Math.random() * valeur.length)];
    const soundUrl = getAudioUrl("de.mp3");

	info("URL :", soundUrl);

    Avatar.play(soundUrl, toClient, "url", "after", () => {
        const texte = Locale.get(["speech.dice1", tts_valeur]);
        info(texte);
        Avatar.speak(texte, client);
    });
};

const jeux2de = async (client, toClient, Locale) => {
    const valeur = ["1", "2", "3", "4", "5", "6"];
    const tts_valeur1 = valeur[Math.floor(Math.random() * valeur.length)];
    const tts_valeur2 = valeur[Math.floor(Math.random() * valeur.length)];
    const total = Number(tts_valeur1) + Number(tts_valeur2);
    const soundUrl = getAudioUrl("de.mp3");

	info("URL :", soundUrl);

    Avatar.play(soundUrl, toClient, "url", "after", () => {
        const texte = Locale.get(["speech.dice2", tts_valeur1, tts_valeur2, total]);
        info(texte);
        Avatar.speak(texte, client);
    });
};

const jeuxpileface = (client, toClient, Locale) => {
    info(Locale.get("speech.pileface"));
    Avatar.askme(Locale.get("speech.pileface"), client, {
        "pile": "pile",
        "face": "face",
        "annule": "done",
        "annuler": "done",
        "terminer": "done"
    }, 15, (answer, end) => {
        end(client);

        info("Games askme réponse :", answer);

        switch (answer) {
            case "pile":
            case "face": {
                const resultat = Math.random() < 0.5 ? "pile" : "face";
                const soundUrl = getAudioUrl("piece.mp3");

                Avatar.play(soundUrl, toClient, "url", "after", () => {
                    const texte = Locale.get(["speech.result", resultat]);
                    info(texte);
                    Avatar.speak(texte, client, () => {
                        if (answer === resultat) {
                            const winMsg = Locale.get("speech.win");
                            info(Locale.get("speech.win"));
                            Avatar.speak(winMsg, client);
                        } else {
                            const loseMsg = Locale.get("speech.lose");
                            info(loseMsg);
                           Avatar.speak(loseMsg, client);
                        }
                    });
                });
                break;
            }
            case "done":
                Avatar.speak(Locale.get("speech.cancel"), client);
                Avatar.Speech.end(client);
                break;
            default:
                info("Games : Aucun message valide reçu (Timeout/Erreur).");
                Avatar.Speech.end(client);
                break;
        }
    });
};

const blackjack = async (client, Locale) => {
    const valeur = ["2", "3", "4", "5", "6", "7", "8", "9", "10", "valet", "dame", "roi", "asse"];
    const couleur = ["coeur", "carreau", "trèfle", "pique"];

    const points = {
        "2": 2, "3": 3, "4": 4, "5": 5, "6": 6, "7": 7,
        "8": 8, "9": 9, "10": 10,
        "valet": 10, "dame": 10, "roi": 10, "asse": 11
    };

    let deck = [];

    valeur.forEach(v => couleur.forEach(c =>
        deck.push({ valeur: v, couleur: c, points: points[v] })
    ));

    for (let i = deck.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [deck[i], deck[j]] = [deck[j], deck[i]];
    }

    const tirerCarte = () => deck.pop();

    const calculerPoints = (main) => {
        let total = main.reduce((somme, carte) => somme + carte.points, 0);
        let as = main.filter(carte => carte.valeur === "asse").length;

        while (total > 21 && as > 0) {
            total -= 10;
            as--;
        }
        return total;
    };

    const joueur = [tirerCarte(), tirerCarte()];
    const croupier = [tirerCarte(), tirerCarte()];

    let totalJoueur = calculerPoints(joueur);
    let totalCroupier = calculerPoints(croupier);

    const jouerCroupier = () => {
        const andWord = Locale.get("speech.and");
        const main = croupier
            .map(carte => Locale.get(["speech.card_of", carte.valeur, carte.couleur]))
            .join(andWord);

        totalCroupier = calculerPoints(croupier);
        const msgMain = Locale.get(["speech.croupier_main", main, totalCroupier]);
        info(msgMain);

        Avatar.speak(msgMain, client, () => {
            while (totalCroupier < 17) {
                const carte = tirerCarte();
                croupier.push(carte);
                totalCroupier = calculerPoints(croupier);
                
                const msgTire = Locale.get(["speech.croupier_tire", carte.valeur, carte.couleur, totalCroupier]);
                info(msgTire);
                Avatar.speak(msgTire, client);
            }

            let msgFin = "";
            if (totalCroupier > 21) {
                msgFin = Locale.get("speech.croupier_bust");
            } else if (totalJoueur > totalCroupier) {
                msgFin = Locale.get("speech.player_win");
            } else if (totalJoueur < totalCroupier) {
                msgFin = Locale.get("speech.dealer_win");
            } else {
                msgFin = Locale.get("speech.draw");
            }

            info(msgFin);
            Avatar.speak(msgFin, client);
        });
    };

    const demanderAction = (promptMsg) => {
        const tts = promptMsg || Locale.get("speech.askAction");
        info(tts);

        Avatar.askme(tts, client, {
            "tirer": "tirer",
            "tirer une carte": "tirer",
            "reste": "rester",
            "rester": "rester",
            "annule": "done",
            "annuler": "done",
            "terminer": "done"
        }, 15, (answer, end) => {
            end(client);

            info("Blackjack askme réponse :", answer);

            switch (answer) {
                case "tirer": {
                    const carte = tirerCarte();
                    joueur.push(carte);
                    totalJoueur = calculerPoints(joueur);

                    const msgDraw = Locale.get(["speech.player_draw", carte.valeur, carte.couleur, totalJoueur]);
                    info(msgDraw);

                    if (totalJoueur > 21) {
                        const msgBust = Locale.get("speech.player_bust");
                        info(msgBust);
                        Avatar.speak(`${msgDraw} ${msgBust}`, client);
                    } else if (totalJoueur === 21) {
                        const msg21 = Locale.get("speech.player_21");
                        info(msg21);
                        Avatar.speak(`${msgDraw} ${msg21}`, client, () => {
                            jouerCroupier();
                        });
                    } else {
                        const nextQuestion = `${msgDraw} ${Locale.get("speech.askAction")}`;
                        demanderAction(nextQuestion);
                    }
                    break;
                }
                case "rester": {
                    const msgStand = Locale.get(["speech.player_stand", totalJoueur]);
                    info(msgStand);
                    Avatar.speak(msgStand, client, () => {
                        jouerCroupier();
                    });
                    break;
                }
                case "done":
                    Avatar.speak(Locale.get("speech.cancel"), client);
                    Avatar.Speech.end(client);
                    break;
                default:
                    info("Blackjack : Aucun message valide reçu (Timeout/Erreur).");
                    Avatar.Speech.end(client);
                    break;
            }
        });
    };

    const andWord = Locale.get("speech.and");
    const mainJoueur = joueur
        .map(carte => Locale.get(["speech.card_of", carte.valeur, carte.couleur]))
        .join(andWord);

    const msgStart = Locale.get(["speech.player_start", mainJoueur, totalJoueur]);
    info(msgStart);

    if (totalJoueur === 21) {
        const msgBlackjack = Locale.get("speech.blackjack_start");
        info(msgBlackjack);
        Avatar.speak(`${msgStart} ${msgBlackjack}`, client, () => {
            jouerCroupier();
        });
    } else {
        const firstPrompt = `${msgStart} ${Locale.get("speech.askAction")}`;
        demanderAction(firstPrompt);
    }
};

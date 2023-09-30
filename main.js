import {Outliner} from "./Outliner.js";

class Mundo {
    constructor() {
        this._outliners = new Map();
        this._relaciones = [];
        this._elementoAgarrado = null;
        this._posicionCursor = [10, 10];
        this._elementoCursor = document.createElement("div");
        this._elementoCursor.className = "cursor-virtual";
        document.body.append(this._elementoCursor);
        this._flechaACursor = null;
    }
    
    pegarseACursor(inspector, offset) {
        inspector.elementoDom().style.transformOrigin = `${offset[0]}px ${offset[1]}px`;
        this._elementoAgarrado = { elemento: inspector, offset };
        this._actualizarPosicionDeElementoAgarrado();
    }
    
    despegarseDeCursor(inspector) {
        inspector.elementoDom().style.transformOrigin = '';
        this._elementoAgarrado = null;
    }

    apuntarDesde(elementoFuente, callback) {
        let relacionExistente = null;
        this._relaciones = this._relaciones.filter(relacion => {
            if (relacion.elementoFuente === elementoFuente) {
                relacionExistente = relacion;
                relacionExistente.flecha.hide('none');
                return false;
            } else {
                return true;
            }
        })
        
        this._flechaACursor = new LeaderLine(
            elementoFuente,
            this._elementoCursor,
            {
                startPlug: 'square',
                endPlug: 'arrow2',
                dash: {animation: true}
            }
        );
        this._flechaACursor.setOptions({startSocket: 'right'});

        const onMouseUp = evento => {
            if (evento.button !== 0) return;

            const candidateDropTargets = document.elementsFromPoint(evento.clientX, evento.clientY);

            let elementoEncontrado = null;
            for (const candidateDropTarget of candidateDropTargets) {
                if (Object.hasOwn(candidateDropTarget, Outliner.outlinerFor)) {
                    elementoEncontrado = candidateDropTarget;
                    break;
                }
            }

            this._flechaACursor.remove();
            this._flechaACursor = null;
            document.body.removeEventListener("mouseup", onMouseUp);
            document.body.removeEventListener("mousemove", onMouseMove);
            
            if (elementoEncontrado !== null) {
                try {
                    callback(elementoEncontrado[Outliner.outlinerFor]);
                } catch (error) {
                    // Sucede cuando intentamos redefinir el prototipo a algo que no sea de tipo object
                    console.error(error);
                    this.agarrarObjeto(error);
                    if (relacionExistente !== null) {
                        this._relaciones.push(relacionExistente);
                        relacionExistente.flecha.show('none');
                    }
                }
            } else {
                if (relacionExistente !== null) {
                    this._relaciones.push(relacionExistente);
                    relacionExistente.flecha.show('none');
                }
            }
        };
        const onMouseMove = evento => {
            const candidateDropTargets = document.elementsFromPoint(evento.clientX, evento.clientY);

            let elementoEncontrado = null;
            for (const candidateDropTarget of candidateDropTargets) {
                if (Object.hasOwn(candidateDropTarget, Outliner.outlinerFor)) {
                    elementoEncontrado = candidateDropTarget;
                    break;
                }
            }

            if (elementoEncontrado !== null) {
                this._flechaACursor.end = elementoEncontrado;
            } else {
                this._flechaACursor.end = this._elementoCursor;
            }
        };
        document.body.addEventListener("mouseup", onMouseUp);
        document.body.addEventListener("mousemove", onMouseMove);
    }
    
    mostrarOutlinerVinculadoA(objeto, outlinerFuente, keyFuente, elementoFuente) {
        const {x, y} = elementoFuente.getBoundingClientRect();
        this.mostarOutlinerDe(objeto, [x + 100, y]);

        this.vincularOutlinerExistenteCon(objeto, outlinerFuente, keyFuente, elementoFuente);
    }

    vincularOutlinerExistenteCon(objeto, outlinerFuente, keyFuente, elementoFuente) {
        const outlinerDestino = this._outliners.get(objeto);
        if (outlinerDestino === undefined) return;

        for (const relacion of this._relaciones) {
            if (relacion.outlinerFuente === outlinerFuente &&
                relacion.elementoFuente === elementoFuente &&
                relacion.outlinerDestino === outlinerDestino) {
                return;
            }
        }

        const flecha = new LeaderLine(
            elementoFuente,
            outlinerDestino.elementoDom(),
            {
                startPlug: "square",
                endPlug: "arrow2",
            },
        );
        flecha.setOptions({startSocket: "right"});
        this._relaciones.push({
            outlinerFuente,
            keyFuente,
            elementoFuente,
            outlinerDestino,
            flecha,
        });
    }

    mostarOutlinerDe(objeto, posicionInicial = [0, 0]) {
        let outliner = this.outlinerDe(objeto)
        if (outliner !== undefined) {
            const classes = outliner.elementoDom().classList;
            classes.remove("temblando");
            setTimeout(() => classes.add("temblando"), 0);
            return;
        }

        outliner = Outliner.nuevoPara(objeto, this, posicionInicial);
        this._outliners.set(objeto, outliner);
        
        document.body.appendChild(
            outliner.elementoDom()
        );
    }

    agarrarObjeto(objeto) {
        this.mostarOutlinerDe(objeto);
        this.outlinerDe(objeto).agarrarEn([50, 10]);
    }

    outlinerDe(objeto) {
        return this._outliners.get(objeto);
    }

    eliminarRelacionConOrigen(outlinerFuente, keyFuente) {
        this._relaciones = this._relaciones.filter(relacion => {
            if (relacion.outlinerFuente === outlinerFuente && relacion.keyFuente === keyFuente) {
                relacion.flecha.remove();
                return false;
            } else {
                return true;
            }
        });
    }

    mover(elemento, [posicionX, posicionY]) {
        elemento.moverA(posicionX, posicionY);
        for (const relacion of this._relacionesConOutliner(elemento)) {
            relacion.flecha.position()
        }
    }

    _relacionesConOutliner(outliner) {
        return this._relaciones.filter(relacion =>
            relacion.outlinerFuente === outliner || relacion.outlinerDestino === outliner,
        );
    }
    actualizarOutliners() {
        this._outliners.forEach(outliner => outliner.actualizar());
        this._relaciones.forEach(relacion => this.actualizarRelacion(relacion));
    }

    actualizarRelacion(relacion) {
        return relacion.flecha.position();
    }

    manejarCambioPosicionCursor([x, y]) {
        this._posicionCursor = [x, y];

        // Duplicado de Outliner.moverA
        this._elementoCursor.style.translate = `${x}px ${y}px`;

        let handled = false;
        if (this._flechaACursor !== null) {
            this._flechaACursor.position();
            handled = true;
        }
        
        if (this._elementoAgarrado !== null) {
            this._actualizarPosicionDeElementoAgarrado();
            handled = true;
        }
        
        return handled;
    }

    _actualizarPosicionDeElementoAgarrado() {
        this.mover(this._elementoAgarrado.elemento, [
            this._posicionCursor[0] - (this._elementoAgarrado.offset)[0],
            this._posicionCursor[1] - (this._elementoAgarrado.offset)[1],
        ]);
    }

    eliminarOutliner(outliner) {
        const relacionesOutliner = this._relacionesConOutliner(outliner);

        relacionesOutliner.forEach(relacion => relacion.flecha.remove());

        this._relaciones = this._relaciones.filter(relacion => !relacionesOutliner.includes(relacion));
        
        this._outliners.delete(outliner.objeto());
        outliner.elementoDom().remove();
    }
}

class Colaboracion {
    constructor(receptor, selector, ...nombresColaboradores) {
        Reflect.defineProperty(this, '_receptor', { enumerable: false, value: receptor, writable: true });
        Reflect.defineProperty(this, '_selector', { enumerable: false, value: selector, writable: true });
        
        for (const nombreColaborador of nombresColaboradores) {
            this[nombreColaborador] = undefined;   
        }
    }

    realizar() {
        return this._receptor[this._selector](...this.argumentos());
    }

    toString() {
        return "📩 una Colaboración";
    }

    copiar() {
        return new this.constructor(this._receptor, this._selector, ...this.argumentos());
    }

    argumentos() {
        return Object.values(this);
    }
}

class Point {
    constructor(x, y) {
        this._x = x;
        this._y = y;
    }

    x() {
        return this._x;
    }

    y() {
        return this._y;
    }
}

function createPromise() {
    let executor;
    const promise = new Promise((resolve, reject) => executor = { resolve, reject });
    executor["promise"] = promise;
    return executor;
}

export default function loop() {
    const mundo = new Mundo();
    document.body.addEventListener("mousemove", evento => {
        if (mundo.manejarCambioPosicionCursor([evento.pageX, evento.pageY])) {
            evento.preventDefault();
        }
    });
    
    mundo.mostarOutlinerDe(new Point(1, 2));
    mundo.mostarOutlinerDe(Colaboracion);
    mundo.mostarOutlinerDe(createPromise);

    window.mundo = mundo;
};
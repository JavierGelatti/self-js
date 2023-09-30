const valorDesconocido = {
    toString: () => "???"
};

function onDragOut(elemento, handler) {
    const mouseUp = evento => {
        if (evento.button !== 0) return;

        finalizarInteraccion();
    };

    const mouseOut = _evento => {
        finalizarInteraccion();

        handler();
    };

    elemento.addEventListener("mousedown", evento => {
        if (evento.button !== 0) return;

        iniciarInteraccion();
    });

    function iniciarInteraccion() {
        elemento.addEventListener("mouseup", mouseUp);
        elemento.addEventListener("mouseout", mouseOut);
    }

    function finalizarInteraccion() {
        elemento.removeEventListener("mouseup", mouseUp);
        elemento.removeEventListener("mouseout", mouseOut);
    }
}

class Slot {
    static NO_VALUE = {
        toString() { return "???" }
    };

    constructor(clave, objeto, outliner, accesible, modificable) {
        this._clave = clave;
        this._objeto = objeto;
        this._outliner = outliner;
        this._accesible = accesible;
        this._modificable = modificable;
        this._valorActual = Slot.NO_VALUE;
        this._elementoFila = null;
        this._celdaValor = null;
        this._mundo = outliner._mundo;
    }

    get key() {
        return this._clave;
    }

    valor(ifNone = () => valorDesconocido) {
        if (this._valorActual === Slot.NO_VALUE) {
            this._valorActual = this._valorIfNone(ifNone);
        }
        return this._valorActual;
    }

    cambiarValor(valorNuevo) {
        this._cambiarValorInterno(valorNuevo);
        this._mundo.actualizarOutliners();
    }

    _valorIfNone(ifNone) {
        try {
            return this._obtenerValorInterno();
        } catch (error) {
            // Esto sucede, por ejemplo, con Function.prototype['caller']
            console.warn(error);
            return ifNone(error);
        }
    }

    _cambiarValorInterno(valorNuevo) {
        throw new Error("subclass responsibility");
    }

    _obtenerValorInterno() {
        throw new Error("subclass responsibility");
    }

    _inicializarFila() {
        const fila = document.createElement("tr");
        fila.className = this.esPropiedad() ? 'propiedad' : 'slot-interno';

        const celdaClave = document.createElement("td");
        celdaClave.textContent = String(this.key);
        fila.appendChild(celdaClave);

        const celdaValor = document.createElement("td");
        fila.appendChild(celdaValor);

        const td3 = document.createElement("td");
        if (this._accesible) {
            const botonInspeccionar = document.createElement("button");
            if (this._modificable) {
                botonInspeccionar.textContent = ">";
            } else {
                botonInspeccionar.textContent = "=";
            }
            botonInspeccionar.title = `Inspeccionar valor de ${String(this.key)}`;
            botonInspeccionar.addEventListener("click", () => {
                const objeto = this.valor(error => {
                    this._mundo.agarrarObjeto(error);
                    throw error;
                });

                this._mundo.mostrarOutlinerVinculadoA(
                    objeto, this._outliner, this.key, botonInspeccionar
                );
            });

            if (this._modificable) {
                onDragOut(botonInspeccionar, () => {
                    this._mundo.apuntarDesde(
                        botonInspeccionar, (objeto) => {
                            this.cambiarValor(objeto);

                            this._mundo.vincularOutlinerExistenteCon(
                                this.valor(() => valorDesconocido), this._outliner, this.key, botonInspeccionar
                            );
                        }
                    );
                });
            }

            td3.appendChild(botonInspeccionar);
        }

        fila.appendChild(td3);

        this._elementoFila = fila;
        this._celdaValor = celdaValor;
        this.actualizarValor();
    }

    elementoFila() {
        if (this._elementoFila === null) {
            this._inicializarFila();
        }
        return this._elementoFila;
    }

    celdaValor() {
        if (this._celdaValor === null) {
            this._inicializarFila();
        }
        return this._celdaValor;
    }

    actualizarValor() {
        const valorActualizado = this._valorIfNone(() => Slot.NO_VALUE);

        if (
            valorActualizado !== Slot.NO_VALUE &&
            this._valorActual !== Slot.NO_VALUE &&
            this._valorActual !== valorActualizado
        ) {
            this._outliner._eliminarRelacionConValorDe(this.key);
        }

        this._valorActual = valorActualizado;
        this.celdaValor().textContent = this._comoString(valorActualizado);
    }

    _comoString(objeto) {
        return this._outliner._comoString(objeto);
    }

    esPropiedad() {
        throw new Error("subclass responsibility");
    }
}

class Propiedad extends Slot {
    constructor(clave, objeto, outliner) {
        super(clave, objeto, outliner, true, true);
    }
    _cambiarValorInterno(valorNuevo) {
        Reflect.set(this._objeto, this.key, valorNuevo);
    }

    _obtenerValorInterno() {
        return Reflect.get(this._objeto, this.key);
    }

    esPropiedad() {
        return true;
    }
}

class SlotInterno extends Slot {
    static parent(objeto, outliner) {
        return new this("🙋[[Prototype]]", objeto, outliner, Reflect.getPrototypeOf, Reflect.setPrototypeOf, true, true);
    }

    static promiseState(promise, outliner) {
        let promiseState = "⏳ pending";
        const slot = new SlotInterno("⚡[[PromiseState]]", promise, outliner, (_) => promiseState, (_, s) => { promiseState = s }, true, false);

        promise.then(result => {
            slot.cambiarValor("🟢 fulfilled");
        }).catch(result => {
            slot.cambiarValor("🔴 rejected");
        });

        return slot;
    }

    static promiseResult(promise, outliner) {
        let promiseResult = undefined;
        const slot = new SlotInterno("⚡[[PromiseResult]]", promise, outliner, (_) => promiseResult, (_, s) => { promiseResult = s }, true, false);

        promise.then(result => {
            slot.cambiarValor(result);
        }).catch(result => {
            slot.cambiarValor(result);
        });

        return slot;
    }

    constructor(clave, objeto, outliner, getter, setter, accesible, modificable) {
        super(clave, objeto, outliner, accesible, modificable);
        this._setter = setter;
        this._getter = getter;
    }
    _cambiarValorInterno(valorNuevo) {
        this._setter(this._objeto, valorNuevo);
    }

    _obtenerValorInterno() {
        return this._getter(this._objeto);
    }

    esPropiedad() {
        return false;
    }
}

export class Outliner {
    static outlinerFor = Symbol();

    constructor(objeto, mundo, posicionInicial) {
        this._mundo = mundo;
        this._objeto = objeto;
        this._posicionActual = posicionInicial;
        this._barraSuperior = null;
        this._titulo = null;
        this._lambdaSoltar = evento => {
            if (evento.button !== 0) return;
            this.soltar();
        };
    }

    _construirElementoDelDom() {
        const elementoDom = document.createElement("div");
        elementoDom.className = "object";

        this._barraSuperior = this._construirBarraSuperior();
        elementoDom.appendChild(this._barraSuperior);

        const panelPrincipal = this._construirPanelPrincipal();
        elementoDom.appendChild(panelPrincipal);

        const fragment = this._construirEvaluador();
        elementoDom.appendChild(fragment);

        elementoDom[Outliner.outlinerFor] = this._objeto;

        return elementoDom;
    }

    _construirBarraSuperior() {
        const barraSuperior = document.createElement("div");
        barraSuperior.className = "barra-superior";

        if (typeof this._objeto === 'function') {
            barraSuperior.classList.add('funcion');
        } else if (typeof this._objeto === "object" && this._objeto !== null) {
            if (this._objeto instanceof Error) {
                barraSuperior.classList.add('error');
            } else {
                barraSuperior.classList.add('objeto-comun');
            }
        } else {
            barraSuperior.classList.add('valor-primitivo');
        }

        this._titulo = document.createTextNode(this._textoBarraSuperior());
        barraSuperior.appendChild(this._titulo);

        barraSuperior.addEventListener("mousedown", evento => {
            if (evento.button !== 0 || evento.target !== barraSuperior) return;
            this.agarrarEn([evento.offsetX, evento.offsetY])
        });

        const botonCerrar = document.createElement('button');
        botonCerrar.textContent = "X";
        botonCerrar.addEventListener("click", evento => {
            this._mundo.eliminarOutliner(this);
            evento.preventDefault();
        });
        barraSuperior.appendChild(botonCerrar);

        return barraSuperior;
    }

    _textoBarraSuperior() {
        throw new Error("subclass responsibility");
    }

    soltar() {
        this._barraSuperior.parentElement.classList.remove("arrastrando");
        document.body.removeEventListener("mouseup", this._lambdaSoltar);
        this._mundo.despegarseDeCursor(this);
    }

    agarrarEn(offset) {
        this._barraSuperior.parentElement.classList.add("arrastrando");
        document.body.addEventListener("mouseup", this._lambdaSoltar);
        this._mundo.pegarseACursor(this, offset);
    }

    /**
     *
     * @private
     * @return Node
     */
    _construirPanelPrincipal() {
        throw new Error("subclass responsibility");
    }

    _construirEvaluador() {
        const evaluador = document.createDocumentFragment();

        const cajaEvaluador = document.createElement("input");
        cajaEvaluador.type = 'text';

        const codigoAEjecutar = () => {
            if (cajaEvaluador.selectionStart === cajaEvaluador.selectionEnd)
                return cajaEvaluador.value;

            return cajaEvaluador.value.substring(
                cajaEvaluador.selectionStart,
                cajaEvaluador.selectionEnd
            );
        };

        const botonGetIt = document.createElement("button");
        botonGetIt.textContent = "Obtener 🫴";
        botonGetIt.addEventListener("click", _evento => {
            const codigoIngresado = codigoAEjecutar();
            let resultado;
            try {
                resultado = this._evaluar(codigoIngresado);
            } catch (error) {
                resultado = error;
            }
            this._agarrarObjeto(resultado);
        });
        const botonDoIt = document.createElement("button");
        botonDoIt.textContent = "Hacer 👉";
        const doIt = _evento => {
            const codigoIngresado = codigoAEjecutar();
            try {
                this._evaluar(codigoIngresado);
            } catch (error) {
                this._agarrarObjeto(error);
            }
        };
        botonDoIt.addEventListener("click", doIt);

        cajaEvaluador.addEventListener("keypress", evento => {
            if (evento.key !== "Enter") return;

            doIt(evento);
            evento.preventDefault();
        });
        evaluador.appendChild(cajaEvaluador);
        evaluador.appendChild(botonGetIt);
        evaluador.appendChild(botonDoIt);
        return evaluador;
    }


    _evaluar(codigoIngresado) {
        try {
            return (function () {
                return eval(`(${codigoIngresado})`);
            }).bind(this._objeto)();
        } finally {
            this._mundo.actualizarOutliners();
        }
    }

    _agarrarObjeto(resultado) {
        this._mundo.agarrarObjeto(resultado);
    }

    moverA(x, y) {
        this._posicionActual = [x, y];
        this._elementoDom.style.translate = `${x}px ${y}px`;
    }

    elementoDom() {
        if (this._elementoDom === undefined) {
            this._elementoDom = this._construirElementoDelDom();
            this.moverA(...this._posicionActual);
        }

        return this._elementoDom;
    }

    _comoString(unValor) {
        if (typeof unValor === "function") {
            return `función ${unValor.name}`;
        }
        if (typeof unValor === "string") {
            return JSON.stringify(unValor);
        }

        try {
            return String(unValor);
        } catch (error) {
            // Esto sucede, por ejemplo, con Date.prototype
            console.warn(error);

            try {
                return Object.prototype.toString.bind(unValor)();
            } catch (segundoError) {
                return "???";
            }
        }
    }

    objeto() {
        return this._objeto;
    }

    actualizar() {
        throw new Error("subclass responsibility");
    }

    static nuevoPara(objeto, mundo, posicionInicial) {
        if ((typeof objeto === "object" && objeto !== null) || typeof objeto === "function") {
            return new OutlinerDeObjeto(objeto, mundo, posicionInicial);
        } else {
            return new OutlinerDeValorPrimitivo(objeto, mundo, posicionInicial);
        }
    }
}

class OutlinerDeObjeto extends Outliner {
    constructor(objeto, mundo, posicionInicial) {
        super(objeto, mundo, posicionInicial);
        this._separadorSlotsInternos = null;
        this._slots = [];
    }

    _construirPanelPrincipal() {
        const panelPrincipal = document.createDocumentFragment();

        this._tablaDePropiedades = document.createElement("table");
        this._separadorSlotsInternos = document.createElement("tr");
        const acciones = document.createElement("td");
        acciones.colSpan = 3;

        const botonNuevaPropiedad = document.createElement('button');
        botonNuevaPropiedad.textContent = "➕ Nueva propiedad";
        botonNuevaPropiedad.addEventListener('click', evento => {
            const nombre = prompt("Nombre de la nueva propiedad:");
            if (nombre !== null) {
                if (Reflect.has(this._objeto, nombre)) {
                    alert("Ya hay una propiedad con ese nombre");
                } else {
                    this._objeto[nombre] = undefined;
                    this.actualizar();
                }
            }
        });
        acciones.appendChild(botonNuevaPropiedad);
        
        this._separadorSlotsInternos.appendChild(acciones);
        this._tablaDePropiedades.appendChild(this._separadorSlotsInternos);

        const ownKeys = Reflect.ownKeys(this._objeto);
        for (const key of ownKeys) {
            this._agregarSlot(new Propiedad(key, this._objeto, this));
        }

        this._agregarSlot(SlotInterno.parent(this._objeto, this));

        if (this._objeto instanceof Promise) {
            this._agregarSlot(SlotInterno.promiseResult(this._objeto, this));
            this._agregarSlot(SlotInterno.promiseState(this._objeto, this));
        } else if (this._objeto instanceof Date) {
            for (const dateKey of Reflect.ownKeys(Date.prototype)) {
                if (typeof dateKey === 'string' && dateKey.startsWith("get") && !dateKey.includes("UTC")) {
                    const key = dateKey.slice(3);
                    const getterKey = `get${key}`;
                    const setterKey = `set${key}`;
                    const esModificable = Reflect.has(this._objeto, setterKey);
                    this._agregarSlot(new SlotInterno(
                        `⚡[[${key}]]`,
                        this._objeto,
                        this,
                        (o) => o[getterKey](),
                        (o, v) => o[setterKey](v),
                        true,
                        esModificable
                    ));
                }
            }
        } else if (this._objeto instanceof Set) {
            const entries = [];
            this._agregarSlot(new SlotInterno(
                `⚡[[Entries]]`,
                this._objeto,
                this,
                (o) => {
                    entries.length = 0;
                    entries.push(...o.keys());
                    return entries;
                },
                (o, v) => { throw new Error() },
                false,
                false
            ));
        } else if (this._objeto instanceof Map) {
            const entries = [];
            this._agregarSlot(new SlotInterno(
                `⚡[[Entries]]`,
                this._objeto,
                this,
                (o) => {
                    entries.length = 0;
                    entries.push(...Array.from(o.entries()).map(([k, v]) => `${this._comoString(k)} 🠒 ${this._comoString(v)}`));
                    return entries;
                },
                (o, v) => { throw new Error() },
                false,
                false
            ));
        }

        panelPrincipal.appendChild(this._tablaDePropiedades);
        return panelPrincipal;
    }
    _agregarSlot(slot) {
        this._slots.push(slot);

        if (slot.esPropiedad()) {
            this._separadorSlotsInternos.insertAdjacentElement("beforebegin", slot.elementoFila());
        } else {
            this._separadorSlotsInternos.insertAdjacentElement("afterend", slot.elementoFila());
        }
    }

    actualizar() {
        if (this._esProxyAnulado()) {
            this._slots.forEach(propiedad => this._eliminarSlot(propiedad));
            return;
        }

        this._titulo.textContent = this._textoBarraSuperior();

        const keysActualizadas = Reflect.ownKeys(this._objeto);
        const keysActuales = this._slots.map(p => p.key);

        for (const slot of this._slots) {
            if (!slot.esPropiedad() || keysActualizadas.includes(slot.key)) {
                slot.actualizarValor();
            } else {
                this._eliminarSlot(slot);
            }
        }

        const newKeys = keysActualizadas.filter(key => !keysActuales.includes(key));
        for (const key of newKeys) {
            this._agregarSlot(new Propiedad(key, this._objeto, this));
        }
    }
    _eliminarSlot(propiedad) {
        this._eliminarRelacionConValorDe(propiedad.key);
        propiedad.elementoFila().remove();
        this._slots = this._slots.filter(p => p !== propiedad);
    }

    _eliminarRelacionConValorDe(key) {
        this._mundo.eliminarRelacionConOrigen(this, key);
    }

    _esProxyAnulado() {
        try {
            Reflect.has(this._objeto);
            return false;
        } catch (error) {
            return error.message === "Cannot perform 'has' on a proxy that has been revoked"
        }
    }

    _textoBarraSuperior() {
        const stringPredeterminado = this._comoString(this._objeto);

        let nombreClase = "objeto";
        try {
            nombreClase = Reflect.getPrototypeOf(this._objeto).constructor.name;
        } catch (e) {}

        return stringPredeterminado === "[object Object]" ? (`un ${nombreClase}`) : stringPredeterminado;
    }
}

class OutlinerDeValorPrimitivo extends Outliner {
    _construirPanelPrincipal() {
        const panelPrincipal = document.createDocumentFragment();
        const estereotipo = document.createElement('div');
        estereotipo.className = 'estereotipo';
        estereotipo.textContent = `«primitivo : ${typeof this._objeto}»`;
        panelPrincipal.appendChild(estereotipo);
        return panelPrincipal;
    }

    actualizar() {
        // No hacemos nada
    }

    _textoBarraSuperior() {
        if (typeof this._objeto === 'string' && this._objeto.includes("\n")) {
            return this._objeto;
        } else {
            return this._comoString(this._objeto);
        }
    }
}
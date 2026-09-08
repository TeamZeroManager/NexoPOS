/**
 * Money (Value Object)
 * ---------------------------------------------------------
 * Responsabilidad:
 *   Representar valores monetarios en pesos colombianos (COP)
 *   usando SIEMPRE enteros, evitando errores de coma flotante
 *   (0.1 + 0.2 !== 0.3).
 *
 * Entradas:
 *   amount (number) - cantidad en pesos enteros (ej: 3500)
 *
 * Salidas:
 *   Instancia inmutable de Money con operaciones aritméticas
 *   seguras (add, subtract, multiply) que siempre devuelven
 *   nuevas instancias de Money.
 *
 * Dependencias:
 *   Ninguna. No conoce HTML, DOM, localStorage ni React.
 *
 * Reglas importantes:
 *   - El monto interno siempre se redondea a entero.
 *   - No se permiten montos NaN o no numéricos.
 *   - Nunca expone directamente floats en operaciones internas.
 */

export class Money {
  #amount;

  constructor(amount) {
    if (typeof amount !== 'number' || Number.isNaN(amount)) {
      throw new TypeError('Money: el monto debe ser un número válido');
    }
    // Redondeo defensivo: el dinero SIEMPRE se maneja en enteros.
    this.#amount = Math.round(amount);
  }

  static of(amount) {
    return new Money(amount);
  }

  static zero() {
    return new Money(0);
  }

  get amount() {
    return this.#amount;
  }

  add(other) {
    return new Money(this.#amount + Money.#toAmount(other));
  }

  subtract(other) {
    return new Money(this.#amount - Money.#toAmount(other));
  }

  multiply(factor) {
    if (typeof factor !== 'number' || Number.isNaN(factor)) {
      throw new TypeError('Money.multiply: el factor debe ser numérico');
    }
    return new Money(this.#amount * factor);
  }

  isNegative() {
    return this.#amount < 0;
  }

  isGreaterOrEqualTo(other) {
    return this.#amount >= Money.#toAmount(other);
  }

  equals(other) {
    return this.#amount === Money.#toAmount(other);
  }

  /** Devuelve el valor entero en pesos, listo para persistir. */
  toPesos() {
    return this.#amount;
  }

  static #toAmount(value) {
    return value instanceof Money ? value.amount : value;
  }
}

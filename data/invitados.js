/* ---------------------------------------------------------------------------
   DATOS DE EJEMPLO. Este archivo se SOBRESCRIBE con lo que produce la función
   "Generar lista para la web" del menú Boda en tu Google Sheet.

   No lo edites a mano una vez que conectes el Sheet: tus cambios se
   perderían la próxima vez que corras el generador.

   Estructura de cada invitación (una = un grupo = un link):
     codigo          4 caracteres. Lo genera el script, nunca lo escribas.
     grupo           el título de la invitación. Ej: "Familia Carrillo"
     miembros        las personas de la lista, separadas por coma en el Sheet.
                     Aquí van ya separadas en un arreglo.
     maxAcompanantes cuántas personas extra puede traer el grupo.
     notas           para vos. El invitado nunca la ve.
--------------------------------------------------------------------------- */

window.INVITADOS = [
  { codigo: 'K4M2', grupo: 'Familia Carrillo',            miembros: ['Victoria Padilla', 'Alejandra Sanchez'],                    maxAcompanantes: 2, notas: '' },
  { codigo: 'A7K2', grupo: 'Familia Vega González',       miembros: ['María Elena Vega', 'Diego Alejandro Vega'],                 maxAcompanantes: 2, notas: 'tíos de Johann' },
  { codigo: 'P9R1', grupo: 'Hermanos Carrillo',           miembros: ['Luis Enrique Carrillo', 'Ana Lucía Carrillo'],              maxAcompanantes: 2, notas: '' },
  { codigo: 'B3X7', grupo: 'Hermanos Vega',               miembros: ['Ricardo Vega', 'Mariana Vega'],                             maxAcompanantes: 2, notas: '' },
  { codigo: 'T6L4', grupo: 'Padres de Abril',             miembros: ['Ramón Carrillo', 'Marta Sánchez'],                          maxAcompanantes: 2, notas: '' },
  { codigo: 'W2Q8', grupo: 'Padres de Johann',            miembros: ['Elda González', 'Rogelio Vega'],                            maxAcompanantes: 2, notas: '' },
  { codigo: 'D5N3', grupo: 'Tíos Carrillo',               miembros: ['José María Mendoza', 'Teresa Carrillo'],                    maxAcompanantes: 2, notas: '' },
  { codigo: 'H8V1', grupo: 'Tíos Vega',                   miembros: ['Fernando Ruiz', 'Silvia González'],                        maxAcompanantes: 2, notas: '' },
  { codigo: 'J4T6', grupo: 'Sobrinos Carrillo',          miembros: ['Camila Carrillo', 'Diego Padilla'],                          maxAcompanantes: 2, notas: '' },
  { codigo: 'R7C9', grupo: 'Sobrinos Vega',              miembros: ['Emiliano Vega', 'Fernanda Carrillo'],                       maxAcompanantes: 2, notas: '' },
  { codigo: 'M2Z5', grupo: 'Primos de Abril',             miembros: ['Daniela Carrillo', 'Paulina Carrillo'],                    maxAcompanantes: 2, notas: '' },
  { codigo: 'Y6F4', grupo: 'Primos de Johann',            miembros: ['Sebastián Vega', 'Isabel Vega'],                            maxAcompanantes: 2, notas: '' },
  { codigo: 'C1J8', grupo: 'Abuela Carrillo',             miembros: ['Rosa María Sánchez'],                                      maxAcompanantes: 2, notas: 'silla cerca, no puede estar mucho tiempo de pie' },
  { codigo: 'N9B2', grupo: 'Abuelo Vega',                 miembros: ['Manuel Vega'],                                            maxAcompanantes: 2, notas: '' },
  { codigo: 'G3X7', grupo: 'Tía Naranjo',                 miembros: ['Guillermina Naranjo'],                                    maxAcompanantes: 2, notas: '' },
  { codigo: 'V5D1', grupo: 'Tío Escobar',                 miembros: ['Rafael Escobar'],                                          maxAcompanantes: 2, notas: '' },
  { codigo: 'E7K4', grupo: 'Ana Laura y Marco',           miembros: ['Ana Laura Ruiz', 'Marco Antonio Ruiz'],                    maxAcompanantes: 2, notas: '' },
  { codigo: 'Q2M9', grupo: 'Sofía e Iván',                miembros: ['Sofía Mendoza', 'Iván Cervantes'],                          maxAcompanantes: 2, notas: '' },
  { codigo: 'L8P3', grupo: 'Regina y Óscar',              miembros: ['Regina Delgado', 'Óscar Paredes'],                          maxAcompanantes: 2, notas: '' },
  { codigo: 'Z4T6', grupo: 'Nancy y David',               miembros: ['Nancy Escobar', 'David Escobar'],                            maxAcompanantes: 2, notas: '' },
  { codigo: 'B1R8', grupo: 'Carlos Mendoza',              miembros: ['Carlos Mendoza'],                                          maxAcompanantes: 1, notas: '' },
  { codigo: 'F6N3', grupo: 'Patricia Cervantes',          miembros: ['Patricia Cervantes'],                                      maxAcompanantes: 1, notas: '' },
  { codigo: 'T9W2', grupo: 'Fernando Ruiz',              miembros: ['Fernando Ruiz'],                                           maxAcompanantes: 1, notas: '' },
  { codigo: 'K3C7', grupo: 'Adriana Ríos',                miembros: ['Adriana Ríos'],                                            maxAcompanantes: 1, notas: '' },
  { codigo: 'D8J5', grupo: 'Bruno Salcedo',               miembros: ['Bruno Salcedo'],                                           maxAcompanantes: 1, notas: '' },
  { codigo: 'S2V9', grupo: 'Amigos de la facultad',        miembros: ['Camila Ferriz', 'Héctor Villalobos', 'Natalia Ortega', 'Rodrigo Peña'], maxAcompanantes: 2, notas: 'grupo grande' },
  { codigo: 'M7B4', grupo: 'Amigos del trabajo',          miembros: ['Esmeralda Lira', 'Joaquín Braun'],                          maxAcompanantes: 2, notas: '' },
  { codigo: 'X5Q1', grupo: 'Familia Padilla',             miembros: ['Rosalía Padilla', 'Emiliano Padilla'],                      maxAcompanantes: 2, notas: '' },
  { codigo: 'P3F6', grupo: 'Familia Sánchez',             miembros: ['Graciela Sánchez', 'Rodrigo Sánchez'],                      maxAcompanantes: 2, notas: '' },
  { codigo: 'N9T2', grupo: 'Familia Paredes',             miembros: ['Carmen Paredes', 'Ana Sofía Paredes'],                      maxAcompanantes: 2, notas: '' }
];

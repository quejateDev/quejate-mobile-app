import React from 'react';
import { render } from '@testing-library/react-native';
import { OverdueModal } from '../detail/OverdueModal';

const QUESTION =
  '¿Has recibido una respuesta a tu solicitud o deseas realizar un seguimiento?';
const WAIT_NOTE =
  'Si la entidad te pidió completar información, te avisó que la pasó a otra entidad o que necesita más tiempo, espera esa nueva fecha antes de presentar una tutela.';

function renderModal() {
  return render(
    <OverdueModal
      visible
      daysExceeded={20}
      onConfirmResolved={jest.fn()}
      onStartFollowup={jest.fn()}
      onDismiss={jest.fn()}
    />,
  );
}

describe('OverdueModal', () => {
  it('recuerda esperar la nueva fecha de la entidad antes de una tutela, con el texto de la web', () => {
    const screen = renderModal();

    expect(screen.getByText(WAIT_NOTE)).toBeTruthy();
  });

  it('lo dice debajo de la pregunta y antes de las opciones', () => {
    const tree = JSON.stringify(renderModal().toJSON());

    const question = tree.indexOf(QUESTION);
    const note = tree.indexOf('Si la entidad te pidió completar información');
    expect(question).toBeGreaterThan(-1);
    expect(question).toBeLessThan(note);
    expect(note).toBeLessThan(tree.indexOf('No he recibido respuesta'));
  });
});

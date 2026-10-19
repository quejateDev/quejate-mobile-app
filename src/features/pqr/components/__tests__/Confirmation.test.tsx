import React from 'react';
import { render } from '@testing-library/react-native';
import type { UseFormGetValues } from 'react-hook-form';
import { Confirmation } from '../create/Confirmation';
import type { FormData, NamedItem } from '../create/createPQRTypes';

const FACILITATOR =
  'Quéjate es un facilitador. Te ayuda a escribir tu PQRSD y la envía a la entidad en tu nombre, porque tú lo pides. Quéjate no es la entidad ni una autoridad: no radica tu petición, no la responde y no puede garantizar que te respondan. El número que te da Quéjate es de seguimiento.';

const entity: NamedItem = { id: 'e1', name: 'Alcaldía de Santa Marta' };

const baseValues: FormData = {
  entityId: 'e1',
  entityDepartmentId: '',
  type: 'COMPLAINT',
  subject: 'No hay agua',
  description: 'Llevo tres semanas sin agua en el barrio.',
  isAnonymous: false,
  isPrivate: false,
};

function renderConfirmation(
  values: Partial<FormData> = {},
  { entities = [entity] }: { entities?: NamedItem[] } = {},
) {
  const getValues = (() => ({ ...baseValues, ...values })) as UseFormGetValues<FormData>;
  return render(
    <Confirmation
      entities={entities}
      entityDepartments={[]}
      visibleFields={[]}
      customFieldValues={{}}
      attachments={[]}
      pinLatitude={null}
      pinLongitude={null}
      pinAddress={null}
      recaptchaToken="tok"
      recaptchaRef={{ current: null }}
      isPending={false}
      stepError={null}
      onSubmit={jest.fn()}
      getValues={getValues}
    />,
  );
}

describe('Confirmation: aviso de facilitador', () => {
  it('dice antes de enviar que Quéjate es un facilitador, y que el radicado llegará al correo', () => {
    const screen = renderConfirmation();

    expect(
      screen.getByText(
        `${FACILITATOR} El radicado oficial lo asigna la entidad, que te lo enviará a tu correo junto con su respuesta.`,
      ),
    ).toBeTruthy();
  });

  it('en una anónima no promete nada por correo', () => {
    const screen = renderConfirmation({ isAnonymous: true });

    expect(
      screen.getByText(`${FACILITATOR} El radicado oficial lo asigna la entidad.`),
    ).toBeTruthy();
    expect(screen.queryByText(/te lo enviará a tu correo/)).toBeNull();
  });

  it('va encima del botón de enviar', () => {
    const screen = renderConfirmation();
    const tree = JSON.stringify(screen.toJSON());

    expect(tree.indexOf('Quéjate es un facilitador')).toBeGreaterThan(-1);
    expect(tree.indexOf('Quéjate es un facilitador')).toBeLessThan(
      tree.indexOf('Enviar PQRSD'),
    );
  });
});

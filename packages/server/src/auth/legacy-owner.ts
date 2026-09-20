// Username du propriétaire créé par la migration add_users_and_vehicle_owner
// pour rattacher les véhicules antérieurs à la table User. Les « ! » le
// rendent impossible à obtenir par inscription : la validation du username
// n'accepte que [a-z0-9_-].
export const LEGACY_OWNER_USERNAME = "!legacy-owner!";
